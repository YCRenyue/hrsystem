/**
 * Reimbursement Controller - 出差报销单
 *
 * 状态机：draft → pending → approved/rejected → paid，pending/approved 可撤销。
 * 通知：
 *  - 提交 → 通知财务（hr_admin/admin）
 *  - 审核结果 → 通知申请人
 *  - 发放 → 通知申请人
 *  - 撤销 → 通知对方
 */

const { Op } = require('sequelize');
const {
  Reimbursement,
  ReimbursementItem,
  BusinessTrip,
  Employee,
  User
} = require('../models');
const reimbursementService = require('../services/ReimbursementService');
const dataScopeService = require('../services/DataScopeService');
const inAppNotification = require('../services/InAppNotificationService');
const { findUserIdForEmployee } = require('../services/approvalService');
const { findEmployeeIdsByName } = require('../utils/employeeSearch');
const {
  ValidationError,
  NotFoundError,
  ForbiddenError
} = require('../middleware/errorHandler');

// 财务审核/发放角色（对应需求：HR/管理员承担费用审核与发放）
const APPROVER_ROLES = ['admin', 'hr_admin'];
const PAYMENT_ROLES = ['admin', 'finance'];
// 仅 admin 可物理删除报销单（保留审计边界）
const DELETABLE_ROLES = ['admin'];
const MANAGEMENT_ROLES = ['admin', 'hr_admin', 'department_manager', 'finance'];
const reimbursementScopeUser = (user) => (
  user?.role === 'finance' ? { ...user, data_scope: 'all' } : user
);

const serializeReimbursement = (record) => {
  const obj = record.toJSON();
  if (record.employee && typeof record.employee.getName === 'function') {
    obj.employee.name = record.employee.getName();
    delete obj.employee.name_encrypted;
  }
  return obj;
};

/**
 * 是否可查看该报销单（员工本人；admin/hr_admin/department_manager 可查看全部）
 */
const canAccessRecord = (user, record) => (
  dataScopeService.canAccessEmployee(reimbursementScopeUser(user), record.employee_id)
);

const canModifyRecord = (user, record) => {
  if (user?.role === 'finance') return user.employee_id === record.employee_id;
  return canAccessRecord(user, record);
};

// 提交后通知审核人（HR/admin）；审核通过后再通知财务发放
const notifyReviewersOnSubmit = async (record, employeeName, submitterUserId) => {
  try {
    const reviewerIds = await inAppNotification.getHrApproverUserIds();
    await inAppNotification.sendToMany(reviewerIds, {
      senderUserId: submitterUserId,
      type: inAppNotification.NotificationTypes.REIMBURSEMENT_SUBMITTED,
      title: '新报销单待审核',
      content: `${employeeName} 提交了报销单 ${record.reimbursement_number}\n金额：¥${Number(record.total_amount).toFixed(2)}`,
      relatedResource: 'reimbursement',
      relatedId: record.reimbursement_id,
      linkUrl: `/reimbursements/${record.reimbursement_id}`
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[notifyReviewersOnSubmit] failed:', e.message);
  }
};

const notifyFinanceToPay = async (record, approverUserId) => {
  try {
    const financeIds = await inAppNotification.getFinanceUserIds();
    await inAppNotification.sendToMany(financeIds, {
      senderUserId: approverUserId,
      type: inAppNotification.NotificationTypes.REIMBURSEMENT_APPROVED,
      title: '报销单待发放',
      content: `报销单 ${record.reimbursement_number} 已审核通过，金额：¥${Number(record.total_amount).toFixed(2)}`,
      relatedResource: 'reimbursement',
      relatedId: record.reimbursement_id,
      linkUrl: `/reimbursements/${record.reimbursement_id}`
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[notifyFinanceToPay] failed:', e.message);
  }
};

const notifyApplicantOnDecision = async (record, decision, approverUserId, notes) => {
  try {
    const recipientUserId = await findUserIdForEmployee(record.employee_id);
    if (!recipientUserId) return;
    const isApproved = decision === 'approved';
    await inAppNotification.send({
      recipientUserId,
      senderUserId: approverUserId,
      type: isApproved
        ? inAppNotification.NotificationTypes.REIMBURSEMENT_APPROVED
        : inAppNotification.NotificationTypes.REIMBURSEMENT_REJECTED,
      title: isApproved ? '报销单已审核通过' : '报销单被驳回',
      content: `报销单 ${record.reimbursement_number} ${isApproved ? '已审核通过，等待财务发放。' : '被驳回。'}${notes ? `\n审核意见：${notes}` : ''}`,
      relatedResource: 'reimbursement',
      relatedId: record.reimbursement_id,
      linkUrl: `/reimbursements/${record.reimbursement_id}`
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[notifyApplicantOnDecision] failed:', e.message);
  }
};

const notifyApplicantOnPaid = async (record, payerUserId) => {
  try {
    const recipientUserId = await findUserIdForEmployee(record.employee_id);
    if (!recipientUserId) return;
    await inAppNotification.send({
      recipientUserId,
      senderUserId: payerUserId,
      type: inAppNotification.NotificationTypes.REIMBURSEMENT_PAID,
      title: '报销款已发放',
      content: `报销单 ${record.reimbursement_number} 已完成发放。${record.payment_reference ? `凭证号：${record.payment_reference}` : ''}`,
      relatedResource: 'reimbursement',
      relatedId: record.reimbursement_id,
      linkUrl: `/reimbursements/${record.reimbursement_id}`
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[notifyApplicantOnPaid] failed:', e.message);
  }
};

/**
 * GET /api/reimbursements
 */
const list = async (req, res) => {
  const {
    page = 1,
    size = 10,
    status,
    trip_id: tripId,
    employee_id: employeeIdFilter,
    employee_name: employeeName,
    keyword
  } = req.query;

  const limit = Math.max(1, parseInt(size, 10));
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * limit;

  const where = {};
  if (status) where.status = status;
  if (tripId) where.trip_id = tripId;
  if (employeeIdFilter) where.employee_id = employeeIdFilter;

  // 按姓名搜索（密文存储 → 内存解密匹配）
  if (employeeName && employeeName.trim()) {
    const matchedIds = await findEmployeeIdsByName(employeeName);
    if (matchedIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          total: 0, page: parseInt(page, 10), size: limit, totalPages: 0
        }
      });
    }
    if (where.employee_id) {
      const fixed = where.employee_id;
      if (!matchedIds.includes(fixed)) {
        return res.json({
          success: true,
          data: [],
          pagination: {
            total: 0, page: parseInt(page, 10), size: limit, totalPages: 0
          }
        });
      }
    } else {
      where.employee_id = { [Op.in]: matchedIds };
    }
  }

  const include = [
    {
      model: Employee,
      as: 'employee',
      attributes: ['employee_id', 'employee_number', 'name_encrypted', 'department_id'],
      required: true
    },
    {
      model: BusinessTrip,
      as: 'trip',
      attributes: ['trip_id', 'trip_number', 'destination', 'start_datetime', 'end_datetime']
    },
    {
      model: User,
      as: 'approver',
      attributes: ['user_id', 'display_name', 'username'],
      required: false
    }
  ];

  if (!dataScopeService.applyResourceScope(
    where,
    include[0],
    reimbursementScopeUser(req.user)
  )) {
    return res.json({
      success: true,
      data: [],
      pagination: {
        total: 0, page: parseInt(page, 10), size: limit, totalPages: 0
      }
    });
  }

  if (keyword) {
    include[0].where = {
      ...(include[0].where || {}),
      employee_number: { [Op.like]: `%${keyword}%` }
    };
  }

  const { count, rows } = await Reimbursement.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: [['created_at', 'DESC']]
  });

  return res.json({
    success: true,
    data: rows.map(serializeReimbursement),
    pagination: {
      total: count,
      page: parseInt(page, 10),
      size: limit,
      totalPages: Math.ceil(count / limit)
    }
  });
};

/**
 * GET /api/reimbursements/:id
 */
const getById = async (req, res) => {
  const record = await Reimbursement.findByPk(req.params.id, {
    include: [
      { model: Employee, as: 'employee', attributes: ['employee_id', 'employee_number', 'name_encrypted', 'department_id'] },
      { model: BusinessTrip, as: 'trip', attributes: ['trip_id', 'trip_number', 'destination', 'start_datetime', 'end_datetime', 'status'] },
      { model: User, as: 'submitter', attributes: ['user_id', 'display_name', 'username'] },
      { model: User, as: 'approver', attributes: ['user_id', 'display_name', 'username'] },
      { model: User, as: 'payer', attributes: ['user_id', 'display_name', 'username'] },
      { model: User, as: 'canceller', attributes: ['user_id', 'display_name', 'username'] },
      { model: ReimbursementItem, as: 'items' }
    ]
  });

  if (!record) throw new NotFoundError('报销单', req.params.id);
  if (!(await canAccessRecord(req.user, record))) throw new ForbiddenError('无权查看该报销单');

  return res.json({ success: true, data: serializeReimbursement(record) });
};

/**
 * POST /api/reimbursements
 */
const create = async (req, res) => {
  const {
    trip_id: tripId,
    employee_id: bodyEmployeeId,
    items = [],
    notes,
    submit = true
  } = req.body;

  if (!tripId) throw new ValidationError('trip_id 为必填');
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('至少录入一条费用明细');
  }

  // 决定报销人：
  //  - 普通员工只能给自己提交
  //  - 管理者可在数据范围内代为提交，未指定 employee_id 时默认取出差单所属员工
  const canActOnBehalf = req.user.data_scope !== 'self' && req.user.role !== 'employee';
  let employeeId = bodyEmployeeId;
  if (!canActOnBehalf) {
    if (!req.user.employee_id) {
      throw new ForbiddenError('账号未关联员工，无法提交报销');
    }
    employeeId = req.user.employee_id;
  } else if (!employeeId) {
    const tripForEmp = await BusinessTrip.findByPk(tripId);
    if (!tripForEmp) throw new ValidationError('关联的出差单不存在');
    employeeId = tripForEmp.employee_id;
  }

  if (!(await dataScopeService.canAccessEmployee(req.user, employeeId))) {
    throw new ForbiddenError('无权为该员工创建报销单');
  }

  const trip = await reimbursementService.ensureTripReimbursable(tripId, employeeId);
  items.forEach((item) => reimbursementService.validateItem(item, trip));
  await reimbursementService.enforceTripDailyLimits(tripId, items);

  const number = await reimbursementService.generateReimbursementNumber();
  const total = reimbursementService.sumAmount(items);

  let created;
  await reimbursementService.runInTransaction(async (t) => {
    created = await Reimbursement.create(
      {
        reimbursement_number: number,
        employee_id: employeeId,
        trip_id: tripId,
        total_amount: total,
        status: submit ? 'pending' : 'draft',
        submitted_by: req.user.user_id,
        submitted_at: submit ? new Date() : null,
        notes: notes || null
      },
      { transaction: t }
    );
    await reimbursementService.createItems(created.reimbursement_id, items, t);
    await reimbursementService.syncTripReimbursementStatus(tripId, t);
  });

  if (submit) {
    const employee = await Employee.findByPk(employeeId);
    const employeeName = employee && typeof employee.getName === 'function'
      ? employee.getName()
      : '员工';
    await notifyReviewersOnSubmit(created, employeeName, req.user.user_id);
  }

  return res.status(201).json({ success: true, data: serializeReimbursement(created) });
};

/**
 * PUT /api/reimbursements/:id
 *  仅 draft / rejected 可编辑
 */
const update = async (req, res) => {
  const record = await Reimbursement.findByPk(req.params.id);
  if (!record) throw new NotFoundError('报销单', req.params.id);
  if (!(await canModifyRecord(req.user, record))) throw new ForbiddenError('无权修改该报销单');
  if (!['draft', 'rejected'].includes(record.status)) {
    throw new ValidationError(`当前状态(${record.status})不可编辑`);
  }

  const { items, notes } = req.body;
  const trip = await BusinessTrip.findByPk(record.trip_id);
  if (!trip) throw new ValidationError('关联出差单不存在');

  if (items !== undefined) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError('至少录入一条费用明细');
    }
    items.forEach((item) => reimbursementService.validateItem(item, trip));
    await reimbursementService.enforceTripDailyLimits(record.trip_id, items, record.reimbursement_id);
  }

  await reimbursementService.runInTransaction(async (t) => {
    if (items !== undefined) {
      await reimbursementService.replaceItems(record.reimbursement_id, items, t);
      record.total_amount = reimbursementService.sumAmount(items);
    }
    if (notes !== undefined) record.notes = notes;
    await record.save({ transaction: t });
  });

  return res.json({ success: true, data: serializeReimbursement(record) });
};

/**
 * POST /api/reimbursements/:id/submit
 */
const submit = async (req, res) => {
  const record = await Reimbursement.findByPk(req.params.id, {
    include: [{ model: ReimbursementItem, as: 'items' }]
  });
  if (!record) throw new NotFoundError('报销单', req.params.id);
  if (!(await canModifyRecord(req.user, record))) throw new ForbiddenError('无权提交该报销单');
  if (!['draft', 'rejected'].includes(record.status)) {
    throw new ValidationError(`当前状态(${record.status})不可提交`);
  }
  if (!record.items || record.items.length === 0) {
    throw new ValidationError('请先录入费用明细再提交');
  }
  // 被拒绝后重新提交时，其间可能已有同一出差的其他报销单占用了当天额度
  const currentItems = record.items.map((item) => item.toJSON());
  await reimbursementService.enforceTripDailyLimits(
    record.trip_id, currentItems, record.reimbursement_id
  );

  await reimbursementService.runInTransaction(async (t) => {
    record.status = 'pending';
    record.submitted_at = new Date();
    record.submitted_by = req.user.user_id;
    record.approver_id = null;
    record.approved_at = null;
    record.approval_notes = null;
    await record.save({ transaction: t });
    await reimbursementService.syncTripReimbursementStatus(record.trip_id, t);
  });

  const employee = await Employee.findByPk(record.employee_id);
  const employeeName = employee && typeof employee.getName === 'function'
    ? employee.getName()
    : '员工';
  await notifyReviewersOnSubmit(record, employeeName, req.user.user_id);

  return res.json({ success: true, data: serializeReimbursement(record) });
};

/**
 * POST /api/reimbursements/:id/approve
 *  Body: { decision: 'approved'|'rejected', notes? }
 */
const approve = async (req, res) => {
  const { decision, notes } = req.body;
  if (!APPROVER_ROLES.includes(req.user.role)) throw new ForbiddenError('无审核权限');
  if (!['approved', 'rejected'].includes(decision)) {
    throw new ValidationError('decision 必须为 approved 或 rejected');
  }

  const record = await Reimbursement.findByPk(req.params.id);
  if (!record) throw new NotFoundError('报销单', req.params.id);
  if (record.status !== 'pending') {
    throw new ValidationError(`当前状态(${record.status})不可审核`);
  }

  await reimbursementService.runInTransaction(async (t) => {
    record.status = decision;
    record.approver_id = req.user.user_id;
    record.approved_at = new Date();
    record.approval_notes = notes || null;
    await record.save({ transaction: t });
    await reimbursementService.syncTripReimbursementStatus(record.trip_id, t);
  });

  await notifyApplicantOnDecision(record, decision, req.user.user_id, notes);
  if (decision === 'approved') await notifyFinanceToPay(record, req.user.user_id);

  return res.json({ success: true, data: serializeReimbursement(record) });
};

/**
 * POST /api/reimbursements/:id/pay
 *  Body: { payment_reference? }
 *  仅 approved → paid
 */
const markPaid = async (req, res) => {
  if (!PAYMENT_ROLES.includes(req.user.role)) throw new ForbiddenError('无发放权限');

  const { payment_reference: paymentReference } = req.body;
  const record = await Reimbursement.findByPk(req.params.id);
  if (!record) throw new NotFoundError('报销单', req.params.id);
  if (record.status !== 'approved') {
    throw new ValidationError(`仅已审核通过的报销单可发放，当前状态：${record.status}`);
  }

  await reimbursementService.runInTransaction(async (t) => {
    record.status = 'paid';
    record.paid_at = new Date();
    record.paid_by = req.user.user_id;
    record.payment_reference = paymentReference || null;
    await record.save({ transaction: t });
    await reimbursementService.syncTripReimbursementStatus(record.trip_id, t);
  });

  await notifyApplicantOnPaid(record, req.user.user_id);

  return res.json({ success: true, data: serializeReimbursement(record) });
};

/**
 * POST /api/reimbursements/:id/cancel
 */
const cancel = async (req, res) => {
  const { reason } = req.body;
  const record = await Reimbursement.findByPk(req.params.id);
  if (!record) throw new NotFoundError('报销单', req.params.id);
  if (!(await canModifyRecord(req.user, record))) throw new ForbiddenError('无权撤销该报销单');
  if (!record.isCancellable()) {
    throw new ValidationError(`当前状态(${record.status})不可撤销`);
  }

  await reimbursementService.runInTransaction(async (t) => {
    record.status = 'cancelled';
    record.cancelled_at = new Date();
    record.cancelled_by = req.user.user_id;
    record.cancellation_reason = reason || null;
    await record.save({ transaction: t });
    await reimbursementService.syncTripReimbursementStatus(record.trip_id, t);
  });

  // 通知对方
  try {
    if (MANAGEMENT_ROLES.includes(req.user.role)) {
      const recipientUserId = await findUserIdForEmployee(record.employee_id);
      if (recipientUserId) {
        await inAppNotification.send({
          recipientUserId,
          senderUserId: req.user.user_id,
          type: inAppNotification.NotificationTypes.REIMBURSEMENT_CANCELLED,
          title: '报销单已被撤销',
          content: `报销单 ${record.reimbursement_number} 已被撤销。${reason ? `原因：${reason}` : ''}`,
          relatedResource: 'reimbursement',
          relatedId: record.reimbursement_id,
          linkUrl: `/reimbursements/${record.reimbursement_id}`
        });
      }
    } else {
      const financeIds = await inAppNotification.getFinanceUserIds();
      await inAppNotification.sendToMany(financeIds, {
        senderUserId: req.user.user_id,
        type: inAppNotification.NotificationTypes.REIMBURSEMENT_CANCELLED,
        title: '员工撤销报销单',
        content: `报销单 ${record.reimbursement_number} 被员工撤销。${reason ? `原因：${reason}` : ''}`,
        relatedResource: 'reimbursement',
        relatedId: record.reimbursement_id,
        linkUrl: `/reimbursements/${record.reimbursement_id}`
      });
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[reimbursement.cancel notify] failed:', e.message);
  }

  return res.json({ success: true, data: serializeReimbursement(record) });
};

/**
 * DELETE /api/reimbursements/:id
 */
const remove = async (req, res) => {
  const record = await Reimbursement.findByPk(req.params.id);
  if (!record) throw new NotFoundError('报销单', req.params.id);
  if (!DELETABLE_ROLES.includes(req.user.role)) throw new ForbiddenError('无删除权限');
  if (!['draft', 'cancelled', 'rejected'].includes(record.status)) {
    throw new ValidationError('仅草稿/已撤销/已拒绝的报销单可删除');
  }
  await reimbursementService.runInTransaction(async (t) => {
    await record.destroy({ transaction: t });
    await reimbursementService.syncTripReimbursementStatus(record.trip_id, t);
  });
  return res.json({ success: true, message: '报销单已删除' });
};

/**
 * GET /api/reimbursements/limits
 */
const getLimits = async (_req, res) => {
  res.json({
    success: true,
    data: {
      daily_limits: reimbursementService.DAILY_LIMITS,
      categories: reimbursementService.VALID_CATEGORIES
    }
  });
};

module.exports = {
  list,
  getById,
  create,
  update,
  submit,
  approve,
  markPaid,
  cancel,
  remove,
  getLimits
};
