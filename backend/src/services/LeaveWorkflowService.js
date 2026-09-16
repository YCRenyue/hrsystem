/**
 * Transactional leave approval workflow.
 */

const { sequelize } = require('../config/database');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const AnnualLeaveService = require('./AnnualLeaveService');
const { ValidationError } = require('../middleware/errorHandler');

const datesBetween = (startDate, endDate) => {
  const dates = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
};

const updateAnnualBalance = async (leave, direction, transaction) => {
  if (leave.leave_type !== 'annual') return;
  const startYear = Number(String(leave.start_date).slice(0, 4));
  const endYear = Number(String(leave.end_date).slice(0, 4));
  if (startYear !== endYear) {
    throw new ValidationError('年假申请不能跨自然年度');
  }
  const employee = await Employee.findByPk(leave.employee_id, { transaction });
  const balance = await AnnualLeaveService.ensureBalance(employee, startYear, { transaction });
  const days = Number(leave.days);
  if (direction > 0 && Number(balance.remaining_days) < days) {
    throw new ValidationError(`年假余额不足，当前剩余 ${balance.remaining_days} 天`);
  }
  balance.used_days = Math.max(0, Number(balance.used_days) + (direction * days));
  balance.remaining_days = Number(balance.total_days)
    + Number(balance.carry_over_days) - Number(balance.used_days);
  await balance.save({ transaction });
};

const syncAttendance = async (leave, transaction) => {
  const dates = datesBetween(leave.start_date, leave.end_date);
  await Promise.all(dates.map(async (date) => {
    const [record, created] = await Attendance.findOrCreate({
      where: { employee_id: leave.employee_id, date },
      defaults: { status: 'leave', source: 'leave', leave_id: leave.leave_id },
      transaction
    });
    if (!created) {
      if (record.business_trip_id) {
        throw new ValidationError(`${date} 已存在已批准出差，不能批准请假`);
      }
      record.previous_status = record.status;
      record.status = 'leave';
      record.leave_id = leave.leave_id;
      await record.save({ transaction });
    }
  }));
};

const rollbackAttendance = async (leave, transaction) => {
  const records = await Attendance.findAll({
    where: { leave_id: leave.leave_id },
    transaction,
    lock: transaction.LOCK.UPDATE
  });
  await Promise.all(records.map(async (record) => {
    if (record.previous_status) {
      record.status = record.previous_status;
      record.previous_status = null;
      record.leave_id = null;
      await record.save({ transaction });
    } else {
      await record.destroy({ transaction });
    }
  }));
};

const approve = async (leave, user, notes) => sequelize.transaction(async (transaction) => {
  await leave.reload({ transaction, lock: transaction.LOCK.UPDATE });
  if (leave.status !== 'pending') throw new ValidationError('仅待审批申请可批准');
  await updateAnnualBalance(leave, 1, transaction);
  await syncAttendance(leave, transaction);
  leave.status = 'approved';
  leave.approver_id = user.user_id;
  leave.approved_at = new Date();
  leave.approval_notes = notes || null;
  await leave.save({ transaction });
  return leave;
});

const cancel = async (leave, transaction) => {
  if (leave.status === 'approved') {
    await updateAnnualBalance(leave, -1, transaction);
    await rollbackAttendance(leave, transaction);
  }
  leave.status = 'cancelled';
  await leave.save({ transaction });
};

module.exports = { approve, cancel, datesBetween };
