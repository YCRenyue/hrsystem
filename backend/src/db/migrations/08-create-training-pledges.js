/**
 * Migration: Create Training Pledges Table
 *
 * Purpose: Store per-employee training commitment details (cost and service years).
 * These values are set by HR before the employee signs the training pledge document.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Creating training_pledges table...');

    await queryInterface.createTable('training_pledges', {
      pledge_id: {
        type: Sequelize.STRING(36),
        primaryKey: true,
        allowNull: false,
        comment: 'UUID primary key'
      },
      employee_id: {
        // Must match employees.employee_id: CHAR(36) utf8mb4_bin
        type: 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin',
        allowNull: false,
        unique: true,
        references: {
          model: 'employees',
          key: 'employee_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'One-to-one relationship with employees'
      },
      training_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Total training cost in CNY (yuan)'
      },
      service_years: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Required service period in years after training completion'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    console.log('training_pledges table created.');
  },

  async down(queryInterface) {
    console.log('Dropping training_pledges table...');
    await queryInterface.dropTable('training_pledges');
    console.log('training_pledges table dropped.');
  }
};
