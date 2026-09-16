/**
 * Annual leave entitlement and balance calculations.
 */

const AnnualLeave = require('../models/AnnualLeave');

const CARRYOVER_CAP = Number(process.env.ANNUAL_LEAVE_CARRYOVER_CAP || 5);

/**
 * Calculate statutory entitlement from completed years of service.
 *
 * @param {string|Date} entryDate Employment start date
 * @param {number} year Entitlement year
 * @returns {number} Annual entitlement in days
 */
const calculateEntitlement = (entryDate, year) => {
  if (!entryDate) return 0;
  const start = new Date(entryDate);
  const yearEnd = new Date(Date.UTC(year, 11, 31));
  let serviceYears = yearEnd.getUTCFullYear() - start.getUTCFullYear();
  const anniversary = new Date(Date.UTC(
    yearEnd.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate()
  ));
  if (anniversary > yearEnd) serviceYears -= 1;
  if (serviceYears < 1) return 0;
  if (serviceYears < 10) return 5;
  if (serviceYears < 20) return 10;
  return 15;
};

/**
 * Create the year's balance when missing.
 *
 * @param {Object} employee Employee model
 * @param {number} year Calendar year
 * @param {Object} options Sequelize options
 * @returns {Promise<Object>} Annual leave balance
 */
const ensureBalance = async (employee, year, options = {}) => {
  const existing = await AnnualLeave.findOne({
    where: { employee_id: employee.employee_id, year },
    transaction: options.transaction,
    lock: options.transaction ? options.transaction.LOCK.UPDATE : undefined
  });
  if (existing) return existing;

  const previous = await AnnualLeave.findOne({
    where: { employee_id: employee.employee_id, year: year - 1 },
    transaction: options.transaction
  });
  const carryOver = Math.min(
    Math.max(Number(previous?.remaining_days || 0), 0),
    CARRYOVER_CAP
  );
  const totalDays = calculateEntitlement(employee.entry_date, year);
  return AnnualLeave.create({
    employee_id: employee.employee_id,
    year,
    total_days: totalDays,
    used_days: 0,
    carry_over_days: carryOver,
    remaining_days: totalDays + carryOver,
    expiry_date: `${year}-12-31`,
    notes: '系统按工龄自动生成'
  }, { transaction: options.transaction });
};

const settleOnOffboarding = async (employee, leaveDate = new Date()) => {
  const year = new Date(leaveDate).getFullYear();
  const balance = await AnnualLeave.findOne({
    where: { employee_id: employee.employee_id, year }
  });
  if (!balance) return null;
  balance.total_days = Number(balance.used_days);
  balance.carry_over_days = 0;
  balance.remaining_days = 0;
  balance.notes = '离职结算：当年未休余额清零';
  await balance.save();
  return balance;
};

module.exports = { calculateEntitlement, ensureBalance, settleOnOffboarding };
