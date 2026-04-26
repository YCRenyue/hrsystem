/**
 * Business Trip Controller
 *
 * 出差申请管理：
 *   - 申请创建/编辑/查询/查看
 *   - 提交、审批（通过/拒绝）、撤销
 *   - 附件 JSON 字段管理（OSS key 列表，文件本身上传走 /api/upload）
 *
 * 权限：
 *   - employee：可查看本人记录、提交/撤销自己的申请
 *   - department_manager / hr_admin / admin：审批、查看全员
 */

const { Op } = require('sequelize');
const {
  BusinessTrip,
  Employee,
  User
} = require('../models');
const businessTripService = require('../services/BusinessTripService');
const inAppNotification = require('../services/InAppNotificationService');
const {
  ValidationError,
  NotFoundError,
  ForbiddenError
} = require('../middleware/errorHandler');

// 当前阶段：仅 admin 可审批/删除（多级审批为后续阶段）
const APPROVABLE_ROLES = ['admin'];
// 可见所有员工出差记录的角色集合（HR/部门经理保留查询能力）
const VIEW_ALL_ROLES = ['admin', 'hr_admin', 'department_manager'];

/**
 * 找到员工对应的 user 账号（用于发通知给员工本人）
 */
const findUserIdForEmployee = async (employeeId) => {
  if (!employeeId) return null;
  const u = await User.findOne({
    where: { employee_id: employeeId },
    attributes: ['user_id']
  });
  return u ? u.user_id : null;
};

/**
 * 通知所有审批人：有新出差申请待审批
 */
const notifyApproversOnSubmit = async (trip, employee, submitterUserId) => {
  try {
    const approverIds = await inAppNotification.getApproverUserIds({
      departmentId: employee?.department_id
    });
    const employeeName = (employee && typeof employee.getName === 'function')
      ? employee.getName()
      : '员工';
    await inAppNotification.sendToMany(approverIds, {
      senderUserId: submitterUserId,
      type: inAppNotification.NotificationTypes.BUSINESS_TRIP_SUBMITTED,
      title: '新出差申请待审批',
      content: `${employeeName} 提交了出差申请 ${trip.trip_number}\n目的地：${trip.destination}\n时间：${trip.start_datetime.toISOString().slice(0, 16).replace('T', ' ')} 至 ${trip.end_datetime.toISOString().slice(0, 16).replace('T', ' ')}`,
      relatedResource: 'business_trip',
      relatedId: trip.trip_id,
      linkUrl: `/business-trips/${trip.trip_id}`
    });
  } catch (e) {
    // 通知失败不阻断业务流程
    // eslint-disable-next-line no-console
    console.error('[notifyApproversOnSubmit] failed:', e.message);
  }
};

/**
 * 通知申请人：审批结果
 */
const notifyApplicantOnApproval = async (trip, decision, approverUserId, notes) => {
  try {
    const recipientUserId = await findUserIdForEmployee(trip.employee_id);
    if (!recipientUserId) return;
    const isApproved = decision === 'approved';
    await inAppNotification.send({
      recipientUserId,
      senderUserId: approverUserId,
      type: isApproved
        ? inAppNotification.NotificationTypes.BUSINESS_TRIP_APPROVED
        : inAppNotification.NotificationTypes.BUSINESS_TRIP_REJECTED,
      title: isApproved ? '出差申请已批准' : '出差申请被拒绝',
      content: `出差单 ${trip.trip_number} ${isApproved ? '已批准，请按计划出行；考勤已自动同步为出差状态。' : '被拒绝。'}${notes ? `\n审批意见：${notes}` : ''}`,
      relatedResource: 'business_trip',
      relatedId: trip.trip_id,
      linkUrl: `/business-trips/${trip.trip_id}`
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[notifyApplicantOnApproval] failed:', e.message);
  }
};

/**
 * 通知相关方：申请被撤销
 *  - 申请人撤销 → 通知审批人/原审批人
 *  - 管理者撤销 → 通知申请人
 */
const notifyOnCancel = async (trip, cancellerRole, cancellerUserId, employee) => {
  try {
    if (VIEW_ALL_ROLES.includes(cancellerRole)) {
      const recipientUserId = await findUserIdForEmployee(trip.employee_id);
      if (recipientUserId) {
        await inAppNotification.send({
          recipientUserId,
          senderUserId: cancellerUserId,
          type: inAppNotification.NotificationTypes.BUSINESS_TRIP_CANCELLED,
          title: '出差申请已被撤销',
          content: `出差单 ${trip.trip_number} 已被管理员撤销。${trip.cancellation_reason ? `原因：${trip.cancellation_reason}` : ''}`,
          relatedResource: 'business_trip',
          relatedId: trip.trip_id,
          linkUrl: `/business-trips/${trip.trip_id}`
        });
      }
    } else {
      const approverIds = await inAppNotification.getApproverUserIds({
        departmentId: employee?.department_id
      });
      const employeeName = (employee && typeof employee.getName === 'function')
        ? employee.getName()
        : '员工';
      await inAppNotification.sendToMany(approverIds, {
        senderUserId: cancellerUserId,
        type: inAppNotification.NotificationTypes.BUSINESS_TRIP_CANCELLED,
        title: '员工撤销出差申请',
        content: `${employeeName} 撤销了出差单 ${trip.trip_number}${trip.cancellation_reason ? `，原因：${trip.cancellation_reason}` : ''}`,
        relatedResource: 'business_trip',
        relatedId: trip.trip_id,
        linkUrl: `/business-trips/${trip.trip_id}`
      });
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[notifyOnCancel] failed:', e.message);
  }
};

/**
 * 序列化出差记录，解密员工姓名、解析附件
 * @param {BusinessTrip} record
 * @returns {Object}
 */
const serializeTrip = (record) => {
  const obj = record.toJSON();
  if (record.employee && typeof record.employee.getName === 'function') {
    obj.employee.name = record.employee.getName();
    delete obj.employee.name_encrypted;
  }
  obj.attachments = record.getAttachments();
  return obj;
};

/**
 * 检查当前用户是否有权访问指定记录
 * @param {Object} user 来自 JWT 的载荷
 * @param {BusinessTrip} record
 * @returns {boolean}
 */
const canAccessTrip = (user, record) => {
  if (!user) return false;
  if (VIEW_ALL_ROLES.includes(user.role)) return true;
  return user.employee_id && record.employee_id === user.employee_id;
};

/**
 * GET /api/business-trips
 */
const getBusinessTrips = async (req, res) => {
  const {
    page = 1,
    size = 10,
    keyword,
    status,
    employee_id: employeeIdFilter,
    startDate,
    endDate
  } = req.query;

  const limit = Math.max(1, parseInt(size, 10));
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * limit;

  const where = {};
  if (status) where.status = status;
  if (employeeIdFilter) where.employee_id = employeeIdFilter;

  if (startDate || endDate) {
    where.start_datetime = {};
    if (startDate) where.start_datetime[Op.gte] = new Date(startDate);
    if (endDate) where.start_datetime[Op.lte] = new Date(`${endDate}T23:59:59`);
  }

  // 普通员工只能看自己；admin/hr_admin/department_manager 可查全部
  if (!VIEW_ALL_ROLES.includes(req.user.role)) {
    if (!req.user.employee_id) {
      return res.json({ success: true, data: [], pagination: { total: 0, page: 1, size: limit } });
    }
    where.employee_id = req.user.employee_id;
  }

  const include = [
    {
      model: Employee,
      as: 'employee',
      attributes: ['employee_id', 'employee_number', 'name_encrypted'],
      required: true
    },
    {
      model: User,
      as: 'approver',
      attributes: ['user_id', 'display_name', 'username'],
      required: false
    }
  ];

  if (keyword) {
    include[0].where = { employee_number: { [Op.like]: `%${keyword}%` } };
  }

  const { count, rows } = await BusinessTrip.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: [['created_at', 'DESC']]
  });

  return res.json({
    success: true,
    data: rows.map(serializeTrip),
    pagination: {
      total: count,
      page: parseInt(page, 10),
      size: limit,
      totalPages: Math.ceil(count / limit)
    }
  });
};

/**
 * GET /api/business-trips/:id
 */
const getBusinessTripById = async (req, res) => {
  const record = await BusinessTrip.findByPk(req.params.id, {
    include: [
      {
        model: Employee,
        as: 'employee',
        attributes: ['employee_id', 'employee_number', 'name_encrypted', 'department_id']
      },
      { model: User, as: 'approver', attributes: ['user_id', 'display_name', 'username'] },
      { model: User, as: 'submitter', attributes: ['user_id', 'display_name', 'username'] },
      { model: User, as: 'canceller', attributes: ['user_id', 'display_name', 'username'] }
    ]
  });

  if (!record) throw new NotFoundError('出差申请', req.params.id);
  if (!canAccessTrip(req.user, record)) throw new ForbiddenError('无权查看该出差申请');

  return res.json({ success: true, data: serializeTrip(record) });
};

/**
 * GET /api/business-trips/conflicts/check
 *  Query: employee_id, start_datetime, end_datetime, exclude_trip_id?
 */
const checkConflicts = async (req, res) => {
  const {
    employee_id: employeeId,
    start_datetime: startDatetime,
    end_datetime: endDatetime,
    exclude_trip_id: excludeTripId
  } = req.query;

  if (!employeeId || !startDatetime || !endDatetime) {
    throw new ValidationError('员工ID、出差开始与结束时间均为必填');
  }

  const conflicts = await businessTripService.detectConflicts(
    employeeId,
    startDatetime,
    endDatetime,
    excludeTripId
  );

  return res.json({
    success: true,
    data: {
      hasConflict: conflicts.leaves.length > 0 || conflicts.trips.length > 0,
      conflictLeaves: conflicts.leaves.map((l) => ({
        leave_id: l.leave_id,
        leave_type: l.leave_type,
        start_date: l.start_date,
        end_date: l.end_date,
        days: l.days
      })),
      conflictTrips: conflicts.trips.map((t) => ({
        trip_id: t.trip_id,
        trip_number: t.trip_number,
        start_datetime: t.start_datetime,
        end_datetime: t.end_datetime,
        status: t.status
      }))
    }
  });
};

/**
 * POST /api/business-trips
 *  权限：员工本人，或 HR/admin 代为创建
 */
const createBusinessTrip = async (req, res) => {
  const {
    employee_id: bodyEmployeeId,
    start_datetime: startDatetime,
    end_datetime: endDatetime,
    destination,
    itinerary,
    purpose,
    transport,
    attachments,
    submit = true
  } = req.body;

  // 决定本次申请所属员工：管理者可代替指定，普通员工只能给自己提交
  const isManager = VIEW_ALL_ROLES.includes(req.user.role);
  let employeeId = bodyEmployeeId;
  if (!isManager) {
    if (!req.user.employee_id) {
      throw new ForbiddenError('账号未关联员工，无法提交出差申请');
    }
    employeeId = req.user.employee_id;
  } else if (!employeeId) {
    throw new ValidationError('请指定出差员工');
  }

  if (!startDatetime || !endDatetime || !destination) {
    throw new ValidationError('出差时间和目的地为必填');
  }

  const employee = await Employee.findByPk(employeeId);
  if (!employee) throw new NotFoundError('员工', employeeId);

  // 计算时长 + 冲突检查
  const durations = businessTripService.calculateDurations(startDatetime, endDatetime);
  const conflicts = await businessTripService.detectConflicts(
    employeeId,
    startDatetime,
    endDatetime
  );
  businessTripService.assertNoConflicts(conflicts);

  const tripNumber = await businessTripService.generateTripNumber();

  const trip = await BusinessTrip.create({
    employee_id: employeeId,
    trip_number: tripNumber,
    start_datetime: new Date(startDatetime),
    end_datetime: new Date(endDatetime),
    destination,
    itinerary: itinerary || null,
    purpose: purpose || null,
    transport: transport || null,
    duration_hours: durations.duration_hours,
    work_hours: durations.work_hours,
    span_days: durations.span_days,
    attachments: attachments ? JSON.stringify(attachments) : null,
    status: submit ? 'pending' : 'draft',
    submitted_by: req.user.user_id,
    submitted_at: submit ? new Date() : null
  });

  if (submit) {
    await notifyApproversOnSubmit(trip, employee, req.user.user_id);
  }

  return res.status(201).json({ success: true, data: serializeTrip(trip) });
};

/**
 * PUT /api/business-trips/:id
 *  仅 draft / pending / rejected 状态可编辑
 */
const updateBusinessTrip = async (req, res) => {
  const trip = await BusinessTrip.findByPk(req.params.id);
  if (!trip) throw new NotFoundError('出差申请', req.params.id);

  if (!canAccessTrip(req.user, trip)) {
    throw new ForbiddenError('无权修改该出差申请');
  }

  if (trip.isLocked()) {
    throw new ValidationError('已批准/进行中的出差申请不可直接修改，请先撤销后重新申请');
  }

  const {
    start_datetime: startDatetime,
    end_datetime: endDatetime,
    destination,
    itinerary,
    purpose,
    transport,
    attachments
  } = req.body;

  const newStart = startDatetime ? new Date(startDatetime) : trip.start_datetime;
  const newEnd = endDatetime ? new Date(endDatetime) : trip.end_datetime;

  // 时间变更需要重新计算与查冲突
  if (startDatetime || endDatetime) {
    const durations = businessTripService.calculateDurations(newStart, newEnd);
    const conflicts = await businessTripService.detectConflicts(
      trip.employee_id,
      newStart,
      newEnd,
      trip.trip_id
    );
    businessTripService.assertNoConflicts(conflicts);

    trip.start_datetime = newStart;
    trip.end_datetime = newEnd;
    trip.duration_hours = durations.duration_hours;
    trip.work_hours = durations.work_hours;
    trip.span_days = durations.span_days;
  }

  if (destination !== undefined) trip.destination = destination;
  if (itinerary !== undefined) trip.itinerary = itinerary;
  if (purpose !== undefined) trip.purpose = purpose;
  if (transport !== undefined) trip.transport = transport;
  if (attachments !== undefined) {
    trip.attachments = attachments ? JSON.stringify(attachments) : null;
  }

  await trip.save();

  return res.json({ success: true, data: serializeTrip(trip) });
};

/**
 * POST /api/business-trips/:id/submit
 *  将草稿/驳回状态转为待审批
 */
const submitBusinessTrip = async (req, res) => {
  const trip = await BusinessTrip.findByPk(req.params.id);
  if (!trip) throw new NotFoundError('出差申请', req.params.id);
  if (!canAccessTrip(req.user, trip)) throw new ForbiddenError('无权提交该出差申请');

  if (!['draft', 'rejected'].includes(trip.status)) {
    throw new ValidationError(`当前状态(${trip.status})不可提交`);
  }

  // 提交前再次校验冲突
  const conflicts = await businessTripService.detectConflicts(
    trip.employee_id,
    trip.start_datetime,
    trip.end_datetime,
    trip.trip_id
  );
  businessTripService.assertNoConflicts(conflicts);

  trip.status = 'pending';
  trip.submitted_at = new Date();
  trip.submitted_by = req.user.user_id;
  trip.approver_id = null;
  trip.approved_at = null;
  trip.approval_notes = null;
  await trip.save();

  const employee = await Employee.findByPk(trip.employee_id);
  await notifyApproversOnSubmit(trip, employee, req.user.user_id);

  return res.json({ success: true, data: serializeTrip(trip) });
};

/**
 * POST /api/business-trips/:id/approve
 *  Body: { decision: 'approved' | 'rejected', notes? }
 */
const approveBusinessTrip = async (req, res) => {
  const { decision, notes } = req.body;

  if (req.user.role !== 'admin') {
    throw new ForbiddenError('无审批权限（当前阶段仅 admin 可审批）');
  }
  if (!['approved', 'rejected'].includes(decision)) {
    throw new ValidationError('decision 必须为 approved 或 rejected');
  }

  const trip = await BusinessTrip.findByPk(req.params.id);
  if (!trip) throw new NotFoundError('出差申请', req.params.id);
  if (trip.status !== 'pending') {
    throw new ValidationError(`当前状态(${trip.status})不可审批`);
  }

  await businessTripService.runInTransaction(async (t) => {
    trip.status = decision;
    trip.approver_id = req.user.user_id;
    trip.approved_at = new Date();
    trip.approval_notes = notes || null;
    await trip.save({ transaction: t });

    if (decision === 'approved') {
      // 锁定考勤区间，覆盖打卡为出差状态
      await businessTripService.syncAttendanceOnApproval(trip, { transaction: t });
    }
  });

  await notifyApplicantOnApproval(trip, decision, req.user.user_id, notes);

  const refreshed = await BusinessTrip.findByPk(trip.trip_id, {
    include: [
      { model: Employee, as: 'employee', attributes: ['employee_id', 'employee_number', 'name_encrypted'] },
      { model: User, as: 'approver', attributes: ['user_id', 'display_name'] }
    ]
  });

  return res.json({ success: true, data: serializeTrip(refreshed) });
};

/**
 * POST /api/business-trips/:id/cancel
 *  Body: { reason? }
 *  允许 pending/approved/in_progress 状态撤销，approved 撤销时回溯考勤记录
 */
const cancelBusinessTrip = async (req, res) => {
  const { reason } = req.body;
  const trip = await BusinessTrip.findByPk(req.params.id);
  if (!trip) throw new NotFoundError('出差申请', req.params.id);
  if (!canAccessTrip(req.user, trip)) throw new ForbiddenError('无权撤销该出差申请');

  if (!['pending', 'approved', 'in_progress'].includes(trip.status)) {
    throw new ValidationError(`当前状态(${trip.status})不可撤销`);
  }

  await businessTripService.runInTransaction(async (t) => {
    if (['approved', 'in_progress'].includes(trip.status)) {
      await businessTripService.rollbackAttendanceOnCancel(trip, { transaction: t });
    }
    trip.status = 'cancelled';
    trip.cancelled_at = new Date();
    trip.cancelled_by = req.user.user_id;
    trip.cancellation_reason = reason || null;
    await trip.save({ transaction: t });
  });

  const employee = await Employee.findByPk(trip.employee_id);
  await notifyOnCancel(trip, req.user.role, req.user.user_id, employee);

  return res.json({ success: true, data: serializeTrip(trip) });
};

/**
 * DELETE /api/business-trips/:id
 *  仅允许删除草稿、已撤销、已拒绝状态的记录（保留审计）
 */
const deleteBusinessTrip = async (req, res) => {
  const trip = await BusinessTrip.findByPk(req.params.id);
  if (!trip) throw new NotFoundError('出差申请', req.params.id);

  if (!APPROVABLE_ROLES.includes(req.user.role)) {
    throw new ForbiddenError('无删除权限');
  }
  if (!['draft', 'cancelled', 'rejected'].includes(trip.status)) {
    throw new ValidationError('仅草稿/已撤销/已拒绝的申请可删除');
  }

  await trip.destroy();
  return res.json({ success: true, message: '出差申请已删除' });
};

/**
 * GET /api/business-trips/stats/work-hours
 *  Query: employee_id, year, month
 *  返回指定员工指定月份的出差工时合计（用于工时统计页面）
 */
const getWorkHoursStats = async (req, res) => {
  const { employee_id: employeeId, year, month } = req.query;
  if (!employeeId || !year || !month) {
    throw new ValidationError('需要提供 employee_id, year, month');
  }

  const yyyy = parseInt(year, 10);
  const mm = parseInt(month, 10);
  const start = new Date(yyyy, mm - 1, 1);
  const end = new Date(yyyy, mm, 0, 23, 59, 59, 999);

  // 加权统计：仅取已批准、进行中或已完成的出差
  const trips = await BusinessTrip.findAll({
    where: {
      employee_id: employeeId,
      status: { [Op.in]: ['approved', 'in_progress', 'completed'] },
      start_datetime: { [Op.lte]: end },
      end_datetime: { [Op.gte]: start }
    }
  });

  // 简化：跨月时按重叠区间重新折算工时
  let totalWorkHours = 0;
  let totalSpanDays = 0;
  for (const trip of trips) {
    const segStart = trip.start_datetime > start ? trip.start_datetime : start;
    const segEnd = trip.end_datetime < end ? trip.end_datetime : end;
    if (segEnd > segStart) {
      const durations = businessTripService.calculateDurations(segStart, segEnd);
      totalWorkHours += durations.work_hours;
      totalSpanDays += durations.span_days;
    }
  }

  return res.json({
    success: true,
    data: {
      employee_id: employeeId,
      year: yyyy,
      month: mm,
      total_work_hours: Number(totalWorkHours.toFixed(2)),
      total_span_days: Number(totalSpanDays.toFixed(2)),
      trip_count: trips.length
    }
  });
};

/**
 * POST /api/business-trips/:id/watermark
 *  Body: { object_key, name?, type?, taken_at }
 *  添加一张水印打卡照片，校验拍摄时间在出差期间内
 */
const addWatermarkPhoto = async (req, res) => {
  const trip = await BusinessTrip.findByPk(req.params.id);
  if (!trip) throw new NotFoundError('出差申请', req.params.id);
  if (!canAccessTrip(req.user, trip)) throw new ForbiddenError('无权操作该出差申请');

  if (!['approved', 'in_progress', 'completed'].includes(trip.status)) {
    throw new ValidationError(`仅已批准/进行中的出差可上传水印打卡，当前状态：${trip.status}`);
  }

  const {
    object_key: objectKey,
    name,
    type,
    taken_at: takenAt,
    uploaded_at: uploadedAt
  } = req.body;

  const list = await businessTripService.addWatermarkPhoto(trip, {
    object_key: objectKey,
    name,
    type,
    taken_at: takenAt,
    uploaded_at: uploadedAt
  });

  return res.json({
    success: true,
    data: {
      attachments: list,
      audit: businessTripService.auditWatermarkPhotos(trip)
    }
  });
};

/**
 * GET /api/business-trips/:id/watermark/audit
 *  返回出差期间每天的水印打卡情况
 */
const getWatermarkAudit = async (req, res) => {
  const trip = await BusinessTrip.findByPk(req.params.id);
  if (!trip) throw new NotFoundError('出差申请', req.params.id);
  if (!canAccessTrip(req.user, trip)) throw new ForbiddenError('无权查看该出差申请');

  const audit = businessTripService.auditWatermarkPhotos(trip);
  const watermarks = businessTripService
    .parseAttachments(trip)
    .filter((a) => a.category === 'watermark');

  return res.json({
    success: true,
    data: {
      ...audit,
      photos: watermarks
    }
  });
};

module.exports = {
  getBusinessTrips,
  getBusinessTripById,
  checkConflicts,
  createBusinessTrip,
  updateBusinessTrip,
  submitBusinessTrip,
  approveBusinessTrip,
  cancelBusinessTrip,
  deleteBusinessTrip,
  getWorkHoursStats,
  addWatermarkPhoto,
  getWatermarkAudit
};
