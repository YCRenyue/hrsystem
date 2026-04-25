/**
 * BusinessTripService
 *
 * 出差申请的业务规则集中点。包含：
 *   - 时间合法性、工时计算
 *   - 冲突检查（请假、其他出差）
 *   - 审批后考勤联动（覆盖打卡 / 标记出差状态）
 *   - 撤销回溯（恢复原考勤状态、清除出差链接）
 *   - 出差单号生成
 *
 * 注意：所有"修改数据"的操作均要求外层包入 sequelize.transaction，
 * 由 controller 层负责事务边界。
 */

const { Op } = require('sequelize');
const {
  BusinessTrip,
  Attendance,
  Leave,
  sequelize
} = require('../models');
const { ValidationError } = require('../middleware/errorHandler');

// 默认每日工时基准（与考勤模块保持一致）
const STANDARD_WORK_HOURS_PER_DAY = 8;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 解析任意输入为 Date
 * @param {Date|string|number} value
 * @returns {Date}
 */
const toDate = (value) => {
  if (value instanceof Date) return value;
  return new Date(value);
};

/**
 * 取日期的 YYYY-MM-DD（按本地时区）
 * @param {Date} d
 * @returns {string}
 */
const formatDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * 取本地零点（一天的开始）
 * @param {Date} d
 * @returns {Date}
 */
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);

/**
 * 取本日 23:59:59.999（一天的结束）
 * @param {Date} d
 * @returns {Date}
 */
const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

/**
 * 增加 n 天
 * @param {Date} d
 * @param {number} n
 * @returns {Date}
 */
const addDays = (d, n) => {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
};

/**
 * 是否周末（周日=0, 周六=6）
 * @param {Date} d
 * @returns {boolean}
 */
const isWeekend = (d) => {
  const day = d.getDay();
  return day === 0 || day === 6;
};

/**
 * 计算出差时长字段
 *
 * 规则：
 *  - duration_hours：起止之间的总小时数
 *  - work_hours：仅工作日时段计入工时；每天最多 8 小时
 *  - span_days：跨越的自然天数（小数）
 *
 * @param {Date|string} startInput
 * @param {Date|string} endInput
 * @returns {{duration_hours: number, work_hours: number, span_days: number}}
 */
const calculateDurations = (startInput, endInput) => {
  const start = toDate(startInput);
  const end = toDate(endInput);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ValidationError('出差起止时间格式不合法');
  }
  if (end.getTime() <= start.getTime()) {
    throw new ValidationError('结束时间必须晚于开始时间');
  }

  const totalMs = end.getTime() - start.getTime();
  const durationHours = Number((totalMs / 3600000).toFixed(2));

  let workHours = 0;
  let spanDays = 0;
  let cursor = start;

  while (cursor.getTime() < end.getTime()) {
    const dayBoundary = endOfDay(cursor);
    const segmentEnd = dayBoundary.getTime() < end.getTime() ? dayBoundary : end;
    const segmentMs = segmentEnd.getTime() - cursor.getTime();
    const segmentHours = segmentMs / 3600000;

    spanDays += Math.min(segmentHours / 24, 1);

    if (!isWeekend(cursor)) {
      workHours += Math.min(segmentHours, STANDARD_WORK_HOURS_PER_DAY);
    }

    cursor = addDays(startOfDay(cursor), 1);
  }

  return {
    duration_hours: durationHours,
    work_hours: Number(workHours.toFixed(2)),
    span_days: Number(spanDays.toFixed(2))
  };
};

/**
 * 生成出差单号 BTYYYYMMDD#### （按日序号）
 * @returns {Promise<string>}
 */
const generateTripNumber = async () => {
  const today = formatDate(new Date()).replace(/-/g, '');
  const prefix = `BT${today}`;

  const last = await BusinessTrip.findOne({
    where: { trip_number: { [Op.like]: `${prefix}%` } },
    order: [['trip_number', 'DESC']]
  });

  let seq = 1;
  if (last && last.trip_number) {
    const tail = parseInt(last.trip_number.slice(prefix.length), 10);
    if (Number.isFinite(tail)) seq = tail + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
};

/**
 * 检查冲突：同员工在同一时间段内不允许有
 *  - 已批准的请假
 *  - 其他未撤销的出差申请（pending/approved/in_progress）
 *
 * @param {string} employeeId
 * @param {Date|string} startInput
 * @param {Date|string} endInput
 * @param {string} [excludeTripId] 编辑时排除自身
 * @returns {Promise<{leaves: Array, trips: Array}>}
 */
const detectConflicts = async (employeeId, startInput, endInput, excludeTripId) => {
  const start = toDate(startInput);
  const end = toDate(endInput);
  const startDate = formatDate(start);
  const endDate = formatDate(end);

  const conflictingLeaves = await Leave.findAll({
    where: {
      employee_id: employeeId,
      status: 'approved',
      start_date: { [Op.lte]: endDate },
      end_date: { [Op.gte]: startDate }
    }
  });

  const tripWhere = {
    employee_id: employeeId,
    status: { [Op.in]: ['pending', 'approved', 'in_progress'] },
    start_datetime: { [Op.lt]: end },
    end_datetime: { [Op.gt]: start }
  };
  if (excludeTripId) {
    tripWhere.trip_id = { [Op.ne]: excludeTripId };
  }
  const conflictingTrips = await BusinessTrip.findAll({ where: tripWhere });

  return { leaves: conflictingLeaves, trips: conflictingTrips };
};

/**
 * 校验冲突结果，按业务规则抛错（严格模式）
 * @param {{leaves: Array, trips: Array}} conflicts
 */
const assertNoConflicts = (conflicts) => {
  if (conflicts.trips.length > 0) {
    throw new ValidationError('出差时间与已有出差申请冲突，请先撤销原出差', {
      conflictTrips: conflicts.trips.map((t) => ({
        trip_id: t.trip_id,
        trip_number: t.trip_number,
        status: t.status
      }))
    });
  }

  if (conflicts.leaves.length > 0) {
    throw new ValidationError('出差时间内已有已批准的请假记录，请先取消该请假再申请出差', {
      conflictLeaves: conflicts.leaves.map((l) => ({
        leave_id: l.leave_id,
        leave_type: l.leave_type,
        start_date: l.start_date,
        end_date: l.end_date
      }))
    });
  }
};

/**
 * 审批通过时同步考勤记录：
 *  - 出差期间每个工作日：覆盖原状态为 business_trip，保存 previous_status 用于撤销
 *  - 周末/节假日不写入考勤记录（避免污染统计）
 *
 * @param {BusinessTrip} trip
 * @param {Object} options
 * @param {import('sequelize').Transaction} [options.transaction]
 * @returns {Promise<number>} 受影响的 attendance 行数
 */
const syncAttendanceOnApproval = async (trip, { transaction } = {}) => {
  const start = toDate(trip.start_datetime);
  const end = toDate(trip.end_datetime);

  let affected = 0;
  let cursor = startOfDay(start);
  const lastDay = startOfDay(end);

  // 防御：跨度过长可能死循环
  const maxIterations = 366;
  let iterations = 0;

  while (cursor.getTime() <= lastDay.getTime() && iterations < maxIterations) {
    iterations += 1;
    if (!isWeekend(cursor)) {
      const dateStr = formatDate(cursor);

      const existing = await Attendance.findOne({
        where: { employee_id: trip.employee_id, date: dateStr },
        transaction
      });

      if (existing) {
        if (!existing.previous_status) {
          existing.previous_status = existing.status;
        }
        existing.status = 'business_trip';
        existing.business_trip_id = trip.trip_id;
        existing.work_hours = STANDARD_WORK_HOURS_PER_DAY;
        existing.late_minutes = 0;
        existing.early_leave_minutes = 0;
        await existing.save({ transaction });
      } else {
        await Attendance.create(
          {
            employee_id: trip.employee_id,
            date: dateStr,
            status: 'business_trip',
            business_trip_id: trip.trip_id,
            work_hours: STANDARD_WORK_HOURS_PER_DAY,
            source: 'business_trip'
          },
          { transaction }
        );
      }
      affected += 1;
    }

    cursor = addDays(cursor, 1);
  }

  return affected;
};

/**
 * 撤销出差时回溯考勤记录
 *  - previous_status 不为空：还原原状态
 *  - previous_status 为空：表示是审批时新建的记录，直接删除
 *
 * @param {BusinessTrip} trip
 * @param {Object} options
 * @param {import('sequelize').Transaction} [options.transaction]
 */
const rollbackAttendanceOnCancel = async (trip, { transaction } = {}) => {
  const linked = await Attendance.findAll({
    where: { business_trip_id: trip.trip_id },
    transaction
  });

  for (const record of linked) {
    if (record.previous_status) {
      record.status = record.previous_status;
      record.previous_status = null;
      record.business_trip_id = null;
      await record.save({ transaction });
    } else {
      await record.destroy({ transaction });
    }
  }
};

/**
 * 校验出差期间不允许提交加班（供加班接口/扩展模块调用）
 * @param {string} employeeId
 * @param {Date|string} startInput
 * @param {Date|string} endInput
 * @returns {Promise<boolean>} 在出差中返回 true
 */
const isWithinActiveBusinessTrip = async (employeeId, startInput, endInput) => {
  const start = toDate(startInput);
  const end = toDate(endInput);

  const trip = await BusinessTrip.findOne({
    where: {
      employee_id: employeeId,
      status: { [Op.in]: ['approved', 'in_progress'] },
      start_datetime: { [Op.lt]: end },
      end_datetime: { [Op.gt]: start }
    }
  });

  return Boolean(trip);
};

/**
 * 包装单个事务任务
 * @param {(t: import('sequelize').Transaction) => Promise<any>} fn
 */
const runInTransaction = async (fn) => sequelize.transaction(fn);

module.exports = {
  STANDARD_WORK_HOURS_PER_DAY,
  MS_PER_DAY,
  calculateDurations,
  generateTripNumber,
  detectConflicts,
  assertNoConflicts,
  syncAttendanceOnApproval,
  rollbackAttendanceOnCancel,
  isWithinActiveBusinessTrip,
  runInTransaction
};
