/**
 * Migration: Add meal_time and source fields to canteen_meal
 *
 * - meal_time: punch time from the canteen card file
 * - source: provenance tag (manual | card_import)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('canteen_meal', 'meal_time', {
      type: Sequelize.TIME,
      allowNull: true,
      comment: '就餐打卡时间',
      after: 'meal_type'
    });
    await queryInterface.addColumn('canteen_meal', 'source', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: '数据来源: manual | card_import',
      after: 'notes'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('canteen_meal', 'source');
    await queryInterface.removeColumn('canteen_meal', 'meal_time');
  }
};
