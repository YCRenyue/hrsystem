const { sequelize } = require('../config/database');
const Department = require('./Department');
const Employee = require('./Employee');
const User = require('./User');
const OnboardingProcess = require('./OnboardingProcess');

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
const initModels = () => {
  return {
    sequelize,
    Department,
    Employee,
    User,
    OnboardingProcess
  };
};

module.exports = {
  sequelize,
  Department,
  Employee,
  User,
  OnboardingProcess,
  syncModels,
  initModels
};
