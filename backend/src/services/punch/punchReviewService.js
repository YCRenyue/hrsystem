/**
 * Punch Review Service
 *
 * HR 对打卡导入结果的人工维护：
 *  - 打卡机工号对照表（设备 + 机器工号 -> 员工）
 *  - 待复核异常打卡（计为午餐/晚餐，或忽略）
 */

const { Op } = require('sequelize');
const {
  Employee, Department, CanteenMeal, PunchCardMapping, PunchAnomaly, sequelize
} = require('../../models');
const { ValidationError, NotFoundError } = require('../../middleware/errorHandler');

const DEVICE_TYPES = ['attendance', 'canteen'];
const RESOLUTIONS = ['lunch', 'dinner', 'ignore'];
const EMPLOYEE_ATTRS = ['employee_id', 'employee_number', 'name_encrypted', 'department_id'];

const employeeInclude = {
  model: Employee,
  as: 'employee',
  attributes: EMPLOYEE_ATTRS,
  include: [{ model: Department, as: 'department', attributes: ['name'] }]
};

const describeEmployee = (employee) => (employee ? {
  employee_id: employee.employee_id,
  employee_number: employee.employee_number,
  name: employee.getName(),
  department_name: employee.department ? employee.department.name : null
} : null);

function assertDeviceType(deviceType) {
  if (!DEVICE_TYPES.includes(deviceType)) {
    throw new ValidationError('device_type 必须是 attendance 或 canteen');
  }
}

/**
 * 查询对照表
 * @param {string} [deviceType]
 */
async function listMappings(deviceType) {
  const where = deviceType ? { device_type: deviceType } : {};
  const rows = await PunchCardMapping.findAll({
    where, include: [employeeInclude], order: [['device_type', 'ASC'], ['external_id', 'ASC']]
  });
  return rows.map((r) => ({
    mapping_id: r.mapping_id,
    device_type: r.device_type,
    external_id: r.external_id,
    external_name: r.external_name,
    employee: describeEmployee(r.employee),
    created_at: r.created_at
  }));
}

/**
 * 新增或更新一条对照（同一设备同一工号只保留一条）
 */
async function saveMapping({
  device_type: deviceType, external_id: externalId, external_name: externalName, employee_id
}, userId) {
  assertDeviceType(deviceType);
  const extId = String(externalId || '').trim();
  if (!extId) throw new ValidationError('external_id 不能为空');
  const employee = await Employee.findByPk(employee_id, { attributes: ['employee_id'] });
  if (!employee) throw new NotFoundError('Employee', employee_id);

  const existing = await PunchCardMapping.findOne({
    where: { device_type: deviceType, external_id: extId }
  });
  const data = { employee_id, external_name: externalName || null, created_by: userId || null };
  if (existing) return existing.update(data);
  return PunchCardMapping.create({ device_type: deviceType, external_id: extId, ...data });
}

/**
 * 删除一条对照
 */
async function deleteMapping(mappingId) {
  const record = await PunchCardMapping.findByPk(mappingId);
  if (!record) throw new NotFoundError('PunchCardMapping', mappingId);
  await record.destroy();
}

/**
 * 查询异常打卡
 */
async function listAnomalies({
  device_type: deviceType, status = 'pending', start_date: startDate, end_date: endDate
} = {}) {
  const where = {};
  if (deviceType) where.device_type = deviceType;
  if (status && status !== 'all') where.status = status;
  if (startDate && endDate) where.punch_date = { [Op.between]: [startDate, endDate] };
  const rows = await PunchAnomaly.findAll({
    where,
    include: [employeeInclude],
    order: [['punch_date', 'ASC'], ['punch_time', 'ASC']]
  });
  return rows.map((r) => ({
    anomaly_id: r.anomaly_id,
    device_type: r.device_type,
    external_id: r.external_id,
    punch_date: r.punch_date,
    punch_time: r.punch_time,
    reason: r.reason,
    status: r.status,
    resolution: r.resolution,
    resolved_at: r.resolved_at,
    employee: describeEmployee(r.employee)
  }));
}

/**
 * 把复核结果写成用餐记录（同一天同一餐已有记录时不重复创建）
 */
async function createReviewedMeal(anomaly, mealType, transaction) {
  const existing = await CanteenMeal.findOne({
    where: {
      employee_id: anomaly.employee_id, meal_date: anomaly.punch_date, meal_type: mealType
    },
    transaction
  });
  if (existing) return;
  await CanteenMeal.create({
    employee_id: anomaly.employee_id,
    meal_date: anomaly.punch_date,
    meal_type: mealType,
    meal_time: `${anomaly.punch_time}:00`,
    location_type: 'canteen',
    payment_method: 'subsidy',
    is_subsidized: true,
    source: 'manual_review',
    notes: 'HR 复核异常打卡后计入'
  }, { transaction });
}

/**
 * 处理一条异常打卡
 * @param {string} anomalyId
 * @param {'lunch'|'dinner'|'ignore'} resolution
 * @param {string} userId
 */
async function resolveAnomaly(anomalyId, resolution, userId) {
  if (!RESOLUTIONS.includes(resolution)) {
    throw new ValidationError('resolution 必须是 lunch、dinner 或 ignore');
  }
  return sequelize.transaction(async (transaction) => {
    const anomaly = await PunchAnomaly.findByPk(anomalyId, { transaction });
    if (!anomaly) throw new NotFoundError('PunchAnomaly', anomalyId);
    if (anomaly.status === 'resolved') throw new ValidationError('该异常已处理');
    if (resolution !== 'ignore') {
      if (anomaly.device_type !== 'canteen') {
        throw new ValidationError('考勤异常只能忽略');
      }
      await createReviewedMeal(anomaly, resolution, transaction);
    }
    await anomaly.update({
      status: 'resolved', resolution, resolved_by: userId || null, resolved_at: new Date()
    }, { transaction });
    return anomaly;
  });
}

/**
 * 批量处理异常打卡，已处理过的跳过
 * @param {string[]} anomalyIds
 * @param {'lunch'|'dinner'|'ignore'} resolution
 * @param {string} userId
 * @returns {Promise<{resolved:number, skipped:number}>}
 */
async function resolveAnomalies(anomalyIds, resolution, userId) {
  if (!Array.isArray(anomalyIds) || anomalyIds.length === 0) {
    throw new ValidationError('请选择要处理的异常打卡');
  }
  const stats = { resolved: 0, skipped: 0 };
  for (const id of anomalyIds) {
    try {
      await resolveAnomaly(id, resolution, userId);
      stats.resolved += 1;
    } catch (error) {
      if (!(error instanceof ValidationError) || error.message !== '该异常已处理') throw error;
      stats.skipped += 1;
    }
  }
  return stats;
}

/**
 * 员工下拉选项（建立对照时使用）
 */
async function listEmployeeOptions() {
  const rows = await Employee.findAll({
    attributes: [...EMPLOYEE_ATTRS, 'status'],
    include: [{ model: Department, as: 'department', attributes: ['name'] }],
    order: [['employee_number', 'ASC']]
  });
  return rows.map((e) => ({ ...describeEmployee(e), status: e.status }));
}

module.exports = {
  listMappings,
  saveMapping,
  deleteMapping,
  listAnomalies,
  resolveAnomaly,
  resolveAnomalies,
  listEmployeeOptions
};
