const { sequelize } = require('../config/database');
const Department = require('./Department');
const Employee = require('./Employee');
const User = require('./User');
const OnboardingProcess = require('./OnboardingProcess');
const Leave = require('./Leave');
const Attendance = require('./Attendance');

/**
 * Model Associations
 * Define relationships between models
 */

// Department associations
Department.hasMany(Employee, {
  foreignKey: 'department_id',
  as: 'employees'
});

Department.belongsTo(Department, {
  foreignKey: 'parent_id',
  as: 'parentDepartment'
});

Department.hasMany(Department, {
  foreignKey: 'parent_id',
  as: 'childDepartments'
});

Department.belongsTo(Employee, {
  foreignKey: 'manager_id',
  as: 'manager'
});

// Employee associations
Employee.belongsTo(Department, {
  foreignKey: 'department_id',
  as: 'department'
});

Employee.hasOne(User, {
  foreignKey: 'employee_id',
  as: 'user'
});

Employee.hasMany(OnboardingProcess, {
  foreignKey: 'employee_id',
  as: 'onboardingProcesses'
});

// User associations
User.belongsTo(Employee, {
  foreignKey: 'employee_id',
  as: 'employee'
});

// OnboardingProcess associations
OnboardingProcess.belongsTo(Employee, {
  foreignKey: 'employee_id',
  as: 'employee'
});

// Leave associations
Leave.belongsTo(Employee, {
  foreignKey: 'employee_id',
  as: 'employee'
});

Leave.belongsTo(User, {
  foreignKey: 'approver_id',
  as: 'approver'
});

Employee.hasMany(Leave, {
  foreignKey: 'employee_id',
  as: 'leaves'
});

// Attendance associations
Attendance.belongsTo(Employee, {
  foreignKey: 'employee_id',
  as: 'employee'
});

Employee.hasMany(Attendance, {
  foreignKey: 'employee_id',
  as: 'attendances'
});

/**
 * Sync models with database
 * @param {boolean} force - If true, drops existing tables before creating new ones
 * @param {boolean} alter - If true, alters tables to match models
 * @returns {Promise<void>}
 */
const syncModels = async (force = false, alter = false) => {
  try {
    await sequelize.sync({ force, alter });
    console.log('Models synchronized with database successfully');
  } catch (error) {
    console.error('Error synchronizing models:', error);
    throw error;
  }
};

/**
 * Initialize all models and associations
 * @returns {Object} Object containing all models
 */
const initModels = () => ({
  sequelize,
  Department,
  Employee,
  User,
  OnboardingProcess,
  Leave,
  Attendance
});

module.exports = {
  sequelize,
  Department,
  Employee,
  User,
  OnboardingProcess,
  Leave,
  Attendance,
  syncModels,
  initModels
};
