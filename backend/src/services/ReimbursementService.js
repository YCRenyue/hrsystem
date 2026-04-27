/**
 * ReimbursementService
 *
 * 出差报销单的业务规则集中点：
 *  - 报销单号生成：RBYYYYMMDD####
 *  - 关联出差单合法性校验（必须存在并已批准）
 *  - 明细类别 / 金额合法性
 *  - 按天住宿/餐补限额校验
 *  - 总额汇总
 *  - 状态机辅助
 */

const { Op } = require('sequelize');
const {
  Reimbursement,
  ReimbursementItem,
  BusinessTrip,
  sequelize
} = require('../models');
const { ValidationError } = require('../middleware/errorHandler');

// 默认按天限额（单位 CNY），后续可改成系统配置
const DAILY_LIMITS = Object.freeze({
  accommodation: 500, // 住宿/天
  meal: 150 // 餐费/天
});

const VALID_CATEGORIES = ['transport', 'accommodation', 'meal', 'local_transport', 'other'];

const formatDate = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * 生成报销单号 RBYYYYMMDD####
 */
const generateReimbursementNumber = async () => {
  const today = formatDate(new Date()).replace(/-/g, '');
  const prefix = `RB${today}`;
  const last = await Reimbursement.findOne({
    where: { reimbursement_number: { [Op.like]: `${prefix}%` } },
    order: [['reimbursement_number', 'DESC']]
  });

  let seq = 1;
  if (last && last.reimbursement_number) {
    const tail = parseInt(last.reimbursement_number.slice(prefix.length), 10);
    if (Number.isFinite(tail)) seq = tail + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
};

/**
 * 校验出差单是否可以发起报销
 */
const ensureTripReimbursable = async (tripId, employeeId) => {
  const trip = await BusinessTrip.findByPk(tripId);
  if (!trip) {
    throw new ValidationError('关联的出差单不存在');
  }
  if (trip.employee_id !== employeeId) {
    throw new ValidationError('报销人和出差单所属员工不一致');
  }
  if (!['approved', 'in_progress', 'completed'].includes(trip.status)) {
    throw new ValidationError('仅已批准的出差单可以申请报销');
  }
  return trip;
};

/**
 * 校验单条明细的合法性 + 落在出差期间
 */
const validateItem = (item, trip) => {
  if (!VALID_CATEGORIES.includes(item.category)) {
    throw new ValidationError(`无效的费用类别 ${item.category}`);
  }
  const amount = Number(item.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new ValidationError('金额必须为非负数');
  }
  if (!item.occurred_on) {
    throw new ValidationError('发生日期为必填');
  }
  const occurred = new Date(item.occurred_on);
  if (Number.isNaN(occurred.getTime())) {
    throw new ValidationError('发生日期格式不合法');
  }

  // 与出差区间比较（按日级别）
  const tripStart = formatDate(trip.start_datetime);
  const tripEnd = formatDate(trip.end_datetime);
  const occurredStr = formatDate(occurred);
  if (occurredStr < tripStart || occurredStr > tripEnd) {
    throw new ValidationError(`发生日期 ${occurredStr} 必须在出差期间 ${tripStart} ~ ${tripEnd}`);
  }
};

/**
 * 限额校验：按天累计住宿/餐费不得超过配置上限
 */
const enforceDailyLimits = (items) => {
  const accumulators = {
    accommodation: {},
    meal: {}
  };
  for (const item of items) {
    const dateStr = formatDate(item.occurred_on);
    const cat = item.category;
    if (cat === 'accommodation' || cat === 'meal') {
      accumulators[cat][dateStr] = (accumulators[cat][dateStr] || 0) + Number(item.amount);
    }
  }

  const violations = [];
  Object.entries(accumulators).forEach(([cat, byDate]) => {
    const limit = DAILY_LIMITS[cat];
    Object.entries(byDate).forEach(([date, total]) => {
      if (total > limit) {
        violations.push({
          category: cat,
          date,
          total,
          limit
        });
      }
    });
  });

  if (violations.length > 0) {
    throw new ValidationError('部分明细超过按天限额', { violations, dailyLimits: DAILY_LIMITS });
  }
};

/**
 * 计算明细汇总
 */
const sumAmount = (items) => items.reduce((acc, i) => acc + Number(i.amount), 0);

/**
 * 创建明细行
 */
const createItems = async (reimbursementId, items, transaction) => {
  if (!Array.isArray(items) || items.length === 0) return [];
  const records = items.map((it) => ({
    reimbursement_id: reimbursementId,
    category: it.category,
    amount: Number(it.amount),
    occurred_on: formatDate(it.occurred_on),
    description: it.description || null,
    invoice_key: it.invoice_key || null,
    invoice_name: it.invoice_name || null
  }));
  return ReimbursementItem.bulkCreate(records, { transaction });
};

/**
 * 替换全部明细（用于编辑）
 */
const replaceItems = async (reimbursementId, items, transaction) => {
  await ReimbursementItem.destroy({
    where: { reimbursement_id: reimbursementId },
    transaction
  });
  return createItems(reimbursementId, items, transaction);
};

/**
 * 同步出差单的报销状态
 *  - 任意 pending/approved 的报销 → trip.reimbursement_status = pending
 *  - 全部 paid → trip.reimbursement_status = reimbursed
 *  - 全部 cancelled/rejected → trip.reimbursement_status = not_started
 */
const syncTripReimbursementStatus = async (tripId, transaction) => {
  const trip = await BusinessTrip.findByPk(tripId, { transaction });
  if (!trip) return;

  const records = await Reimbursement.findAll({
    where: { trip_id: tripId },
    transaction
  });

  if (records.length === 0) {
    trip.reimbursement_status = 'not_started';
  } else if (records.every((r) => ['cancelled', 'rejected'].includes(r.status))) {
    trip.reimbursement_status = 'not_started';
  } else if (records.every((r) => r.status === 'paid' || ['cancelled', 'rejected'].includes(r.status))) {
    trip.reimbursement_status = 'reimbursed';
  } else {
    trip.reimbursement_status = 'pending';
  }
  await trip.save({ transaction });
};

const runInTransaction = (fn) => sequelize.transaction(fn);

module.exports = {
  DAILY_LIMITS,
  VALID_CATEGORIES,
  generateReimbursementNumber,
  ensureTripReimbursable,
  validateItem,
  enforceDailyLimits,
  sumAmount,
  createItems,
  replaceItems,
  syncTripReimbursementStatus,
  runInTransaction
};
