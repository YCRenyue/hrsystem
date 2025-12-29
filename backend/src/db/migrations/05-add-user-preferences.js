/**
 * Migration: Add User Preferences Field
 *
 * Purpose: Add preferences column to users table for storing user settings
 * (theme, font, color preferences, etc.)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Adding preferences column to users table...');

    await queryInterface.addColumn('users', 'preferences', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'User preferences (theme, font, color, etc.)'
    });

    console.log('preferences column added successfully.');
  },

  async down(queryInterface, _Sequelize) {
    console.log('Removing preferences column from users table...');

    await queryInterface.removeColumn('users', 'preferences');

    console.log('preferences column removed successfully.');
  }
};
