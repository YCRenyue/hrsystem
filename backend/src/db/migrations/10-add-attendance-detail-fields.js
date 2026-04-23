/**
 * Migration: Extend attendance records and add attendance_summaries table
 *
 * - Adds morning/afternoon/overtime punch columns on attendances
 * - Creates attendance_summaries table for period-level statistics
 *   (absent/leave/late/early-leave counts imported from 考勤卡表)
 */

const TIME_COLUMNS = [
  { name: 'morning_check_in', comment: '上午上班打卡时间', after: 'check_out_time' },
  { name: 'morning_check_out', comment: '上午下班打卡时间', after: 'morning_check_in' },
  { name: 'afternoon_check_in', comment: '下午上班打卡时间', after: 'morning_check_out' },
  { name: 'afternoon_check_out', comment: '下午下班打卡时间', after: 'afternoon_check_in' },
  { name: 'overtime_check_in', comment: '加班签到打卡时间', after: 'afternoon_check_out' },
  { name: 'overtime_check_out', comment: '加班签退打卡时间', after: 'overtime_check_in' }
];

async function addPunchColumns(queryInterface, Sequelize) {
  for (const col of TIME_COLUMNS) {
    await queryInterface.addColumn('attendances', col.name, {
      type: Sequelize.TIME,
      allowNull: true,
      comment: col.comment,
      after: col.after
    });
  }
  await queryInterface.addColumn('attendances', 'source', {
    type: Sequelize.STRING(50),
    allowNull: true,
    comment: '数据来源: manual | card_import',
    after: 'device_info'
  });
}

function buildSummaryTableDef(Sequelize) {
  const dec = (precision, scale, comment) => ({
    type: Sequelize.DECIMAL(precision, scale),
    allowNull: false,
    defaultValue: 0,
    comment
  });
  const intCol = (comment) => ({
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment
  });
  return {
    summary_id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      comment: '考勤汇总ID'
    },
    employee_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'employees', key: 'employee_id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: '员工ID'
    },
    period_start: {
      type: Sequelize.DATEONLY, allowNull: false, comment: '统计周期开始'
    },
    period_end: {
      type: Sequelize.DATEONLY, allowNull: false, comment: '统计周期结束'
    },
    external_employee_number: {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: '考勤表中的工号（与花名册可能不同）'
    },
    absent_days: dec(5, 1, '旷工天数'),
    leave_days: dec(5, 1, '请假天数'),
    business_trip_days: dec(5, 1, '出差天数'),
    work_days: dec(5, 1, '上班天数'),
    overtime_normal_hours: dec(6, 2, '正常加班小时数'),
    overtime_holiday_hours: dec(6, 2, '假日加班小时数'),
    late_count: intCol('迟到次数'),
    late_minutes: intCol('迟到总分钟数'),
    early_leave_count: intCol('早退次数'),
    early_leave_minutes: intCol('早退总分钟数'),
    source_file: { type: Sequelize.STRING(255), allowNull: true, comment: '来源文件名' },
    imported_at: { type: Sequelize.DATE, allowNull: true, comment: '导入时间' },
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
  };
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await addPunchColumns(queryInterface, Sequelize);

    await queryInterface.createTable('attendance_summaries', buildSummaryTableDef(Sequelize));

    await queryInterface.addIndex('attendance_summaries', ['employee_id']);
    await queryInterface.addIndex('attendance_summaries', ['period_start', 'period_end']);
    await queryInterface.addConstraint('attendance_summaries', {
      fields: ['employee_id', 'period_start', 'period_end'],
      type: 'unique',
      name: 'uq_attendance_summary_employee_period'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('attendance_summaries');
    const cols = [
      'source',
      ...TIME_COLUMNS.map((c) => c.name).reverse()
    ];
    for (const name of cols) {
      await queryInterface.removeColumn('attendances', name);
    }
  }
};
