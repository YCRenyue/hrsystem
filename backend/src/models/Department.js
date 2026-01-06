const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Department Model
 * Represents organizational departments
 */
class Department extends Model {
  /**
   * Get full department path including parent departments
   * @returns {Promise<string>} Full department path
   */
  async getFullPath() {
    const path = [this.name];
    let current = this;

    while (current.parent_id) {
      const parent = await Department.findByPk(current.parent_id);
      if (parent) {
        path.unshift(parent.name);
        current = parent;
      } else {
        break;
      }
    }

    return path.join(' > ');
  }

  /**
   * Get all child departments recursively
   * @returns {Promise<Array<Department>>} Array of child departments
   */
  async getAllChildren() {
    const children = await Department.findAll({
      where: { parent_id: this.department_id }
    });

    const allChildren = [...children];

    for (const child of children) {
      const grandChildren = await child.getAllChildren();
      allChildren.push(...grandChildren);
    }

    return allChildren;
  }

  /**
   * Get employee count in this department
   * @returns {Promise<number>} Number of employees
   */
  async getEmployeeCount() {
    const Employee = require('./Employee');
    return await Employee.count({
      where: {
        department_id: this.department_id,
        status: 'active'
      }
    });
  }
}

Department.init(
  {
    department_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '部门ID'
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '部门名称',
      validate: {
        notEmpty: {
          msg: '部门名称不能为空'
        },
        len: {
          args: [1, 100],
          msg: '部门名称长度必须在1到100个字符之间'
        }
      }
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '部门编码'
    },
    parent_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '上级部门ID',
      references: {
        model: 'departments',
        key: 'department_id'
      }
    },
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: '部门层级'
    },
    path: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '部门路径'
    },
    manager_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '部门负责人ID',
      references: {
        model: 'employees',
        key: 'employee_id'
      }
    },
    dingtalk_dept_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '钉钉部门ID'
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'active',
      comment: '状态',
      validate: {
        isIn: {
          args: [['active', 'inactive']],
          msg: '无效的状态'
        }
      }
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '排序顺序'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '部门描述'
    },
    created_by: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '创建人'
    }
  },
  {
    sequelize,
    modelName: 'Department',
    tableName: 'departments',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: '部门信息表',
    indexes: [
      {
        name: 'idx_parent_id',
        fields: ['parent_id']
      },
      {
        name: 'idx_code',
        fields: ['code']
      },
      {
        name: 'idx_status',
        fields: ['status']
      },
      {
        name: 'idx_dingtalk_dept',
        fields: ['dingtalk_dept_id']
      }
    ]
  }
);

module.exports = Department;
