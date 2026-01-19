/**
 * Migration: Add OSS File Fields to Employees
 *
 * Purpose: Add OSS object key fields for storing employee documents
 * (ID card front/back, bank card, diploma)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Adding OSS file fields to employees table...');

    const columns = [
      {
        name: 'id_card_front_oss_key',
        definition: {
          type: Sequelize.STRING(500),
          allowNull: true,
          comment: 'ID card front image OSS object key'
        }
      },
      {
        name: 'id_card_back_oss_key',
        definition: {
          type: Sequelize.STRING(500),
          allowNull: true,
          comment: 'ID card back image OSS object key'
        }
      },
      {
        name: 'bank_card_oss_key',
        definition: {
          type: Sequelize.STRING(500),
          allowNull: true,
          comment: 'Bank card image OSS object key'
        }
      },
      {
        name: 'diploma_oss_key',
        definition: {
          type: Sequelize.STRING(500),
          allowNull: true,
          comment: 'Diploma image OSS object key'
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

    // Remove old S3 path columns if they exist
    const oldColumns = ['id_card_front_s3_path', 'id_card_back_s3_path'];
    for (const colName of oldColumns) {
      try {
        await queryInterface.removeColumn('employees', colName);
        console.log(`Removed old column: ${colName}`);
      } catch (error) {
        // Column might not exist, ignore
        console.log(`Column ${colName} does not exist, skipping removal...`);
      }
    }

    console.log('OSS file fields migration completed.');
  },

  async down(queryInterface, Sequelize) {
    console.log('Removing OSS file fields from employees table...');

    const columns = [
      'id_card_front_oss_key',
      'id_card_back_oss_key',
      'bank_card_oss_key',
      'diploma_oss_key'
    ];

    for (const colName of columns) {
      try {
        await queryInterface.removeColumn('employees', colName);
        console.log(`Removed column: ${colName}`);
      } catch (error) {
        console.log(`Column ${colName} does not exist, skipping...`);
      }
    }

    // Restore old S3 path columns
    await queryInterface.addColumn('employees', 'id_card_front_s3_path', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'ID card front S3 path'
    });

    await queryInterface.addColumn('employees', 'id_card_back_s3_path', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'ID card back S3 path'
    });

    console.log('OSS file fields rollback completed.');
  }
};
