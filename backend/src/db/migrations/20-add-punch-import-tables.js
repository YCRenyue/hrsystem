/**
 * Migration: 打卡导入改造
 *
 * - 新建 punch_card_mappings：HR 维护「设备 + 机器工号 -> 员工」对照
 * - 新建 punch_anomalies：导入时无法自动判定、待 HR 复核的打卡
 * - 考勤状态枚举增加 missing_punch（缺卡）
 */

const BASE_STATUSES = [
  'normal', 'late', 'early_leave', 'absent', 'leave', 'holiday', 'weekend', 'business_trip'
];

const timestampColumns = (Sequelize) => ({
  created_at: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  },
  updated_at: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  }
});

const employeeRef = (Sequelize, comment) => ({
  type: Sequelize.UUID,
  allowNull: false,
  references: { model: 'employees', key: 'employee_id' },
  onUpdate: 'CASCADE',
  onDelete: 'CASCADE',
  comment
});

async function createMappingTable(queryInterface, Sequelize) {
  await queryInterface.createTable('punch_card_mappings', {
    mapping_id: { type: Sequelize.UUID, primaryKey: true, comment: '对照记录ID' },
    device_type: {
      type: Sequelize.ENUM('attendance', 'canteen'),
      allowNull: false,
      comment: '打卡设备'
    },
    external_id: { type: Sequelize.STRING(50), allowNull: false, comment: '打卡机工号' },
    external_name: { type: Sequelize.STRING(100), allowNull: true, comment: '打卡机姓名' },
    employee_id: employeeRef(Sequelize, '对应的员工ID'),
    created_by: { type: Sequelize.UUID, allowNull: true, comment: '创建人用户ID' },
    ...timestampColumns(Sequelize)
  }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });
  await queryInterface.addIndex('punch_card_mappings', ['device_type', 'external_id'], {
    unique: true,
    name: 'idx_punch_card_mappings_device_external'
  });
  await queryInterface.addIndex('punch_card_mappings', ['employee_id'], {
    name: 'idx_punch_card_mappings_employee'
  });
}

async function createAnomalyTable(queryInterface, Sequelize) {
  await queryInterface.createTable('punch_anomalies', {
    anomaly_id: { type: Sequelize.UUID, primaryKey: true, comment: '异常记录ID' },
    device_type: {
      type: Sequelize.ENUM('attendance', 'canteen'),
      allowNull: false,
      comment: '打卡设备'
    },
    employee_id: employeeRef(Sequelize, '员工ID'),
    external_id: { type: Sequelize.STRING(50), allowNull: true, comment: '打卡机工号' },
    punch_date: { type: Sequelize.DATEONLY, allowNull: false, comment: '打卡日期' },
    punch_time: { type: Sequelize.STRING(5), allowNull: false, comment: '打卡时间 HH:MM' },
    reason: { type: Sequelize.STRING(50), allowNull: false, comment: '异常原因' },
    status: {
      type: Sequelize.ENUM('pending', 'resolved'),
      allowNull: false,
      defaultValue: 'pending',
      comment: '处理状态'
    },
    resolution: { type: Sequelize.STRING(20), allowNull: true, comment: 'lunch/dinner/ignore' },
    resolved_by: { type: Sequelize.UUID, allowNull: true, comment: '处理人用户ID' },
    resolved_at: { type: Sequelize.DATE, allowNull: true, comment: '处理时间' },
    ...timestampColumns(Sequelize)
  }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });
  await queryInterface.addIndex(
    'punch_anomalies',
    ['device_type', 'employee_id', 'punch_date', 'punch_time'],
    { unique: true, name: 'idx_punch_anomalies_unique_punch' }
  );
  await queryInterface.addIndex('punch_anomalies', ['status'], {
    name: 'idx_punch_anomalies_status'
  });
  await queryInterface.addIndex('punch_anomalies', ['punch_date'], {
    name: 'idx_punch_anomalies_date'
  });
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await createMappingTable(queryInterface, Sequelize);
    await createAnomalyTable(queryInterface, Sequelize);
    await queryInterface.changeColumn('attendances', 'status', {
      type: Sequelize.ENUM(...BASE_STATUSES, 'missing_punch'),
      defaultValue: 'normal',
      comment: '考勤状态：增加 missing_punch-缺卡'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      'UPDATE attendances SET status = ? WHERE status = ?',
      { replacements: ['normal', 'missing_punch'] }
    );
    await queryInterface.changeColumn('attendances', 'status', {
      type: Sequelize.ENUM(...BASE_STATUSES),
      defaultValue: 'normal',
      comment: '考勤状态'
    });
    await queryInterface.dropTable('punch_anomalies');
    await queryInterface.dropTable('punch_card_mappings');
  }
};
