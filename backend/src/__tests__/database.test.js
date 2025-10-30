/**
 * Database Connection Tests
 * Tests database connectivity and configuration
 */

const { sequelize, testConnection } = require('../config/database');
const { Department, Employee, User, OnboardingProcess } = require('../models');

describe('Database Connection Tests', () => {
  /**
   * Test database connection establishment
   */
  describe('Connection', () => {
    test('should connect to database successfully', async () => {
      try {
        await sequelize.authenticate();
        expect(sequelize).toBeDefined();
      } catch (error) {
        throw new Error(`Database connection failed: ${error.message}`);
      }
    });

    test('should have correct dialect configured', () => {
      expect(sequelize.options.dialect).toBe('mysql');
    });

    test('should have connection pool configured', () => {
      expect(sequelize.options.pool).toBeDefined();
      expect(sequelize.options.pool.max).toBeGreaterThan(0);
    });

    test('should use utf8mb4 charset', () => {
      expect(sequelize.options.charset).toBe('utf8mb4');
      expect(sequelize.options.collate).toBe('utf8mb4_unicode_ci');
    });
  });

  /**
   * Test database configuration
   */
  describe('Configuration', () => {
    test('should have database name configured', () => {
      expect(sequelize.config.database).toBeDefined();
      expect(typeof sequelize.config.database).toBe('string');
    });

    test('should have host configured', () => {
      expect(sequelize.config.host).toBeDefined();
    });

    test('should have valid port configured', () => {
      expect(sequelize.config.port).toBeDefined();
      // Port can be either string or number from config
      const port = parseInt(sequelize.config.port);
      expect(port).toBeGreaterThan(0);
      expect(port).toBeLessThanOrEqual(65535);
    });

    test('should disable soft deletes (paranoid mode)', () => {
      expect(sequelize.options.define.paranoid).toBe(false);
    });

    test('should enable timestamps', () => {
      expect(sequelize.options.define.timestamps).toBe(true);
    });

    test('should use underscored naming', () => {
      expect(sequelize.options.define.underscored).toBe(true);
    });
  });

  /**
   * Test model definitions
   */
  describe('Models', () => {
    test('should have all required models defined', () => {
      expect(Department).toBeDefined();
      expect(Employee).toBeDefined();
      expect(User).toBeDefined();
      expect(OnboardingProcess).toBeDefined();
    });

    test('should have correct model names', () => {
      expect(Department.name).toBe('Department');
      expect(Employee.name).toBe('Employee');
      expect(User.name).toBe('User');
      expect(OnboardingProcess.name).toBe('OnboardingProcess');
    });

    test('should have correct table names', () => {
      expect(Department.tableName).toBe('departments');
      expect(Employee.tableName).toBe('employees');
      expect(User.tableName).toBe('users');
      expect(OnboardingProcess.tableName).toBe('onboarding_processes');
    });

    test('Department model should have required fields', () => {
      const attributes = Department.rawAttributes;
      expect(attributes.department_id).toBeDefined();
      expect(attributes.name).toBeDefined();
      expect(attributes.code).toBeDefined();
      expect(attributes.parent_id).toBeDefined();
      expect(attributes.manager_id).toBeDefined();
    });

    test('Employee model should have encrypted fields', () => {
      const attributes = Employee.rawAttributes;
      expect(attributes.name_encrypted).toBeDefined();
      expect(attributes.phone_encrypted).toBeDefined();
      expect(attributes.id_card_encrypted).toBeDefined();
      expect(attributes.bank_card_encrypted).toBeDefined();
      expect(attributes.birth_date_encrypted).toBeDefined();
    });

    test('User model should have authentication fields', () => {
      const attributes = User.rawAttributes;
      expect(attributes.user_id).toBeDefined();
      expect(attributes.username).toBeDefined();
      expect(attributes.password_hash).toBeDefined();
      expect(attributes.role).toBeDefined();
      expect(attributes.status).toBeDefined();
    });

    test('OnboardingProcess model should have workflow fields', () => {
      const attributes = OnboardingProcess.rawAttributes;
      expect(attributes.process_id).toBeDefined();
      expect(attributes.employee_id).toBeDefined();
      expect(attributes.status).toBeDefined();
      expect(attributes.form_token).toBeDefined();
      expect(attributes.token_expires_at).toBeDefined();
    });
  });

  /**
   * Test model associations
   */
  describe('Model Associations', () => {
    test('Department should have employees association', () => {
      const associations = Department.associations;
      expect(associations.employees).toBeDefined();
      expect(associations.employees.associationType).toBe('HasMany');
    });

    test('Employee should belong to Department', () => {
      const associations = Employee.associations;
      expect(associations.department).toBeDefined();
      expect(associations.department.associationType).toBe('BelongsTo');
    });

    test('Employee should have User association', () => {
      const associations = Employee.associations;
      expect(associations.user).toBeDefined();
      expect(associations.user.associationType).toBe('HasOne');
    });

    test('User should belong to Employee', () => {
      const associations = User.associations;
      expect(associations.employee).toBeDefined();
      expect(associations.employee.associationType).toBe('BelongsTo');
    });

    test('OnboardingProcess should belong to Employee', () => {
      const associations = OnboardingProcess.associations;
      expect(associations.employee).toBeDefined();
      expect(associations.employee.associationType).toBe('BelongsTo');
    });
  });

  /**
   * Test database operations
   */
  describe('Database Operations', () => {
    test('should be able to query database', async () => {
      const result = await sequelize.query('SELECT 1 + 1 AS result');
      expect(result).toBeDefined();
      expect(result[0]).toBeDefined();
      expect(result[0][0].result).toBe(2);
    });

    test('should be able to check if tables exist', async () => {
      const [results] = await sequelize.query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
      `);
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    test('should handle query errors gracefully', async () => {
      try {
        await sequelize.query('SELECT * FROM nonexistent_table');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.name).toMatch(/Sequelize/);
      }
    });
  });

  /**
   * Test connection pooling
   */
  describe('Connection Pool', () => {
    test('should have connection pool initialized', () => {
      const pool = sequelize.connectionManager.pool;
      expect(pool).toBeDefined();
    });

    test('should respect max connections setting', () => {
      expect(sequelize.options.pool.max).toBe(10);
    });

    test('should respect min connections setting', () => {
      expect(sequelize.options.pool.min).toBe(0);
    });

    test('should have acquire timeout configured', () => {
      expect(sequelize.options.pool.acquire).toBe(30000);
    });

    test('should have idle timeout configured', () => {
      expect(sequelize.options.pool.idle).toBe(10000);
    });
  });

  /**
   * Test error handling
   */
  describe('Error Handling', () => {
    test('should throw error on invalid query', async () => {
      await expect(
        sequelize.query('INVALID SQL SYNTAX')
      ).rejects.toThrow();
    });

    test('should provide meaningful error messages', async () => {
      try {
        await sequelize.query('SELECT * FROM nonexistent_table');
      } catch (error) {
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
      }
    });
  });

  /**
   * Cleanup after all tests
   */
  afterAll(async () => {
    // Close database connection after tests complete
    await sequelize.close();
  });
});
