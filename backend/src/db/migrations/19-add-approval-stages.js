/**
 * Add department and HR approval stages to leave and business trip workflows.
 */

const addStageColumns = async (queryInterface, table, Sequelize) => {
  await queryInterface.addColumn(table, 'approval_stage', {
    type: Sequelize.ENUM('department', 'hr'),
    allowNull: false,
    defaultValue: 'hr'
  });
  await queryInterface.addColumn(table, 'manager_approver_id', {
    type: Sequelize.UUID,
    allowNull: true,
    references: { model: 'users', key: 'user_id' }
  });
  await queryInterface.addColumn(table, 'manager_approved_at', {
    type: Sequelize.DATE,
    allowNull: true
  });
  await queryInterface.addColumn(table, 'manager_approval_notes', {
    type: Sequelize.TEXT,
    allowNull: true
  });
};

const removeStageColumns = async (queryInterface, table) => {
  await queryInterface.removeColumn(table, 'manager_approval_notes');
  await queryInterface.removeColumn(table, 'manager_approved_at');
  await queryInterface.removeColumn(table, 'manager_approver_id');
  await queryInterface.removeColumn(table, 'approval_stage');
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await addStageColumns(queryInterface, 'leaves', Sequelize);
    await addStageColumns(queryInterface, 'business_trip_applications', Sequelize);
  },

  down: async (queryInterface) => {
    await removeStageColumns(queryInterface, 'business_trip_applications');
    await removeStageColumns(queryInterface, 'leaves');
  }
};
