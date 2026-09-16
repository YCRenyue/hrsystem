/**
 * Link attendance rows to their approved leave application.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('attendances', 'leave_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'leaves', key: 'leave_id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addIndex('attendances', ['leave_id'], {
      name: 'idx_attendances_leave_id'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('attendances', 'idx_attendances_leave_id');
    await queryInterface.removeColumn('attendances', 'leave_id');
  }
};
