/**
 * Migration: Add Document Confirmation Fields to Employees
 *
 * Purpose: Add fields for company policy reading confirmation
 * and employee training commitment letter tracking.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Adding document confirmation fields to employees table...');

    const columns = [
      {
        name: 'policy_ack_status',
        definition: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Whether employee has confirmed reading company policies'
        }
      },
      {
        name: 'policy_ack_signed_at',
        definition: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'When employee signed the policy confirmation'
        }
      },
      {
        name: 'policy_ack_file_key',
        definition: {
          type: Sequelize.STRING(500),
          allowNull: true,
          comment: 'OSS object key for signed policy confirmation document'
        }
      },
      {
        name: 'training_pledge_status',
        definition: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Whether employee has signed the training commitment'
        }
      },
      {
        name: 'training_pledge_signed_at',
        definition: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'When employee signed the training commitment'
        }
      },
      {
        name: 'training_pledge_file_key',
        definition: {
          type: Sequelize.STRING(500),
          allowNull: true,
          comment: 'OSS object key for signed training commitment document'
        }
      }
    ];

    for (const column of columns) {
      try {
        await queryInterface.addColumn('employees', column.name, column.definition);
        console.log(`Added column: ${column.name}`);
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log(`Column ${column.name} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }

    console.log('Document confirmation fields migration completed.');
  },

  async down(queryInterface) {
    console.log('Removing document confirmation fields from employees table...');

    const columns = [
      'policy_ack_status',
      'policy_ack_signed_at',
      'policy_ack_file_key',
      'training_pledge_status',
      'training_pledge_signed_at',
      'training_pledge_file_key'
    ];

    for (const colName of columns) {
      try {
        await queryInterface.removeColumn('employees', colName);
        console.log(`Removed column: ${colName}`);
      } catch (error) {
        console.log(`Column ${colName} does not exist, skipping...`);
      }
    }

    console.log('Document confirmation fields rollback completed.');
  }
};
