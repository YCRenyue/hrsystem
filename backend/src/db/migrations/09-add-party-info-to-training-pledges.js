/**
 * Migration: Add party info fields to Training Pledges Table
 *
 * Purpose: Store the party A/B information captured at signing time so the
 * document can be re-rendered correctly when viewing after signing.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Adding party info columns to training_pledges table...');

    const columns = [
      ['party_a_name', { type: Sequelize.STRING(200), allowNull: true }],
      ['party_a_address', { type: Sequelize.STRING(500), allowNull: true }],
      ['employee_gender', { type: Sequelize.STRING(10), allowNull: true }],
      ['employee_id_card', { type: Sequelize.STRING(100), allowNull: true }],
      ['employee_household_address', { type: Sequelize.STRING(500), allowNull: true }],
      ['employee_current_address', { type: Sequelize.STRING(500), allowNull: true }],
      ['contract_sign_date', { type: Sequelize.STRING(50), allowNull: true }],
      ['contract_start_date', { type: Sequelize.STRING(50), allowNull: true }],
      ['contract_end_date', { type: Sequelize.STRING(50), allowNull: true }],
    ];

    for (const [columnName, options] of columns) {
      await queryInterface.addColumn('training_pledges', columnName, options);
    }

    console.log('Party info columns added to training_pledges.');
  },

  async down(queryInterface) {
    console.log('Removing party info columns from training_pledges table...');

    const columns = [
      'party_a_name',
      'party_a_address',
      'employee_gender',
      'employee_id_card',
      'employee_household_address',
      'employee_current_address',
      'contract_sign_date',
      'contract_start_date',
      'contract_end_date',
    ];

    for (const columnName of columns) {
      await queryInterface.removeColumn('training_pledges', columnName);
    }

    console.log('Party info columns removed from training_pledges.');
  }
};
