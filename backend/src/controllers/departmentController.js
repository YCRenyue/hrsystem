/**
 * Department Controller
 */
const { Department } = require('../models');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

/**
 * Get all departments with employee count
 */
const getDepartments = async (req, res) => {
  const { Employee } = require('../models');
  const { sequelize } = require('../config/database');

  const departments = await Department.findAll({
    attributes: {
      include: [
        [
          sequelize.literal(`(
            SELECT COUNT(*)
            FROM employees AS e
            WHERE e.department_id = Department.department_id
            AND e.status = 'active'
          )`),
          'employee_count'
        ]
      ]
    },
    order: [['name', 'ASC']]
  });

  res.json({
    success: true,
    data: departments
  });
};

/**
 * Get department by ID
 */
const getDepartmentById = async (req, res) => {
  const { id } = req.params;

  const department = await Department.findByPk(id);

  if (!department) {
    throw new NotFoundError('Department', id);
  }

  res.json({
    success: true,
    data: department
  });
};

/**
 * Create new department
 */
const createDepartment = async (req, res) => {
  const { name, code, parent_id, manager_id, description, sort_order } = req.body;

  if (!name || !code) {
    throw new ValidationError('Department name and code are required');
  }

  // Check if department code already exists
  const existing = await Department.findOne({
    where: { code }
  });

  if (existing) {
    throw new ValidationError('Department code already exists');
  }

  const department = await Department.create({
    name,
    code,
    parent_id,
    manager_id,
    description,
    sort_order,
    created_by: req.user?.user_id
  });

  res.status(201).json({
    success: true,
    data: department
  });
};

/**
 * Update department
 */
const updateDepartment = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const department = await Department.findByPk(id);

  if (!department) {
    throw new NotFoundError('Department', id);
  }

  // Check if new code conflicts with existing department
  if (updateData.code && updateData.code !== department.code) {
    const existing = await Department.findOne({
      where: { code: updateData.code }
    });

    if (existing) {
      throw new ValidationError('Department code already exists');
    }
  }

  await department.update(updateData);

  res.json({
    success: true,
    data: department
  });
};

/**
 * Delete department
 */
const deleteDepartment = async (req, res) => {
  const { id } = req.params;

  const department = await Department.findByPk(id);

  if (!department) {
    throw new NotFoundError('Department', id);
  }

  await department.destroy();

  res.json({
    success: true,
    message: 'Department deleted successfully'
  });
};

module.exports = {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
};
