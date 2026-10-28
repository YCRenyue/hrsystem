/**
 * Add the unpaid leave type to leaves.leave_type.
 *
 * The leave form, Excel import and labels already offer 无薪假 (unpaid),
 * but the column enum did not include it, so saving such a leave failed.
 */

const BASE_TYPES = [
  'annual', 'sick', 'personal', 'compensatory',
  'maternity', 'paternity', 'marriage', 'bereavement', 'other'
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('leaves', 'leave_type', {
      type: Sequelize.ENUM(...BASE_TYPES, 'unpaid'),
      allowNull: false,
      comment: 'Leave type'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      'UPDATE leaves SET leave_type = ? WHERE leave_type = ?',
      { replacements: ['other', 'unpaid'] }
    );
    await queryInterface.changeColumn('leaves', 'leave_type', {
      type: Sequelize.ENUM(...BASE_TYPES),
      allowNull: false,
      comment: 'Leave type'
    });
  }
};
