/**
 * Migration: Create Employment Contracts Table + Employee Signing Fields
 *
 * Purpose: Support the labor contract signing feature. HR configures the
 * contract terms for an employee (placeholder legal text is rendered on the
 * frontend using these values), the employee reviews/edits their own party
 * info and signs, and a screenshot of the signed document is stored in OSS.
 *
 * Naming note: this is deliberately named `employment_contract_*` (not
 * `contract_*`) to avoid colliding with the pre-existing, unrelated
 * `employees.contract_type` / `employees.contract_expiry_date` columns used
 * for HR roster / contract-expiry-reminder tracking.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableNames = (await queryInterface.showAllTables()).map((table) => (
      typeof table === 'string' ? table : table.tableName
    ));

    if (!tableNames.includes('employment_contracts')) {
      console.log('Creating employment_contracts table...');
      await queryInterface.createTable('employment_contracts', {
        contract_id: {
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
        party_a_name: {
          type: Sequelize.STRING(200),
          allowNull: true,
          comment: 'Party A (employer) name, HR-configured'
        },
        party_a_address: {
          type: Sequelize.STRING(500),
          allowNull: true,
          comment: 'Party A (employer) address, HR-configured'
        },
        contract_type: {
          type: Sequelize.STRING(50),
          allowNull: true,
          comment: 'Contract term type (fixed-term / open-term / task-based), HR-configured'
        },
        position: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'Job position covered by this contract, HR-configured'
        },
        work_location: {
          type: Sequelize.STRING(200),
          allowNull: true,
          comment: 'Work location, HR-configured'
        },
        contract_start_date: {
          type: Sequelize.STRING(50),
          allowNull: true,
          comment: 'Contract start date (display text), HR-configured'
        },
        contract_end_date: {
          type: Sequelize.STRING(50),
          allowNull: true,
          comment: 'Contract end date (display text), HR-configured'
        },
        monthly_salary: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          comment: 'Monthly salary in CNY, HR-configured'
        },
        employee_gender: {
          type: Sequelize.STRING(10),
          allowNull: true,
          comment: 'Employee gender captured at signing time'
        },
        employee_id_card_encrypted: {
          type: Sequelize.BLOB,
          allowNull: true,
          comment: 'Employee ID card number captured at signing time (AES-256 encrypted)'
        },
        employee_household_address: {
          type: Sequelize.STRING(500),
          allowNull: true,
          comment: 'Employee household address captured at signing time'
        },
        employee_current_address: {
          type: Sequelize.STRING(500),
          allowNull: true,
          comment: 'Employee current address captured at signing time'
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

      console.log('employment_contracts table created.');
    }

    console.log('Adding employment_contract_* signing fields to employees table...');
    const employeeColumns = await queryInterface.describeTable('employees');
    const columns = [
      {
        name: 'employment_contract_status',
        definition: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Whether employee has signed the labor contract'
        }
      },
      {
        name: 'employment_contract_signed_at',
        definition: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'When employee signed the labor contract'
        }
      },
      {
        name: 'employment_contract_file_key',
        definition: {
          type: Sequelize.STRING(500),
          allowNull: true,
          comment: 'OSS object key for signed labor contract document'
        }
      }
    ];

    for (const column of columns) {
      if (!employeeColumns[column.name]) {
        await queryInterface.addColumn('employees', column.name, column.definition);
        console.log(`Added column: ${column.name}`);
      }
    }

    console.log('employment_contracts migration completed.');
  },

  async down(queryInterface) {
    console.log('Rolling back employment_contracts migration...');

    const employeeColumns = await queryInterface.describeTable('employees');
    const columns = [
      'employment_contract_status',
      'employment_contract_signed_at',
      'employment_contract_file_key'
    ];
    for (const colName of columns) {
      if (employeeColumns[colName]) {
        await queryInterface.removeColumn('employees', colName);
      }
    }

    const tableNames = (await queryInterface.showAllTables()).map((table) => (
      typeof table === 'string' ? table : table.tableName
    ));
    if (tableNames.includes('employment_contracts')) {
      await queryInterface.dropTable('employment_contracts');
    }
    console.log('employment_contracts rollback completed.');
  }
};
