/**
 * Employee Model Tests
 * Testing encryption, decryption, and data display methods
 */
const { Employee, Department } = require('../models');
const encryptionService = require('../utils/encryption');

describe('Employee Model', () => {
  let testDepartment;

  beforeAll(async () => {
    // Create test department
    testDepartment = await Department.create({
      name: '测试部门',
      code: 'TEST',
      description: 'Test Department'
    });
  });

  afterAll(async () => {
    // Clean up
    if (testDepartment) {
      await testDepartment.destroy();
    }
  });

  describe('toSafeObject Method', () => {
    let testEmployee;

    beforeEach(async () => {
      // Create test employee
      testEmployee = await Employee.create({
        employee_number: 'TEST001',
        email: 'test@company.com',
        department_id: testDepartment.department_id,
        status: 'active',
        entry_date: '2024-01-15'
      });

      // Set encrypted fields
      testEmployee.setName('张三');
      testEmployee.setPhone('13800138000');
      testEmployee.setIdCard('110101199001011234');
      await testEmployee.save();

      // Reload with department association
      await testEmployee.reload({
        include: [{
          model: Department,
          as: 'department',
          attributes: ['department_id', 'name', 'code']
        }]
      });
    });

    afterEach(async () => {
      if (testEmployee) {
        await testEmployee.destroy();
      }
    });

    test('should include department object in safe output', () => {
      const safeData = testEmployee.toSafeObject(false);

      expect(safeData.department).toBeDefined();
      expect(safeData.department.name).toBe('测试部门');
      expect(safeData.department.code).toBe('TEST');
      expect(safeData.department_id).toBe(testDepartment.department_id);
    });

    test('should include department when loaded', () => {
      const safeData = testEmployee.toSafeObject(true);

      expect(safeData.department).not.toBeNull();
      expect(safeData.department.department_id).toBe(testDepartment.department_id);
    });

    test('should mask sensitive data when includeSensitive is false', () => {
      const safeData = testEmployee.toSafeObject(false);

      expect(safeData.name).toMatch(/^.\*\*$/); // Masked name (first char + **)
      expect(safeData.phone).toMatch(/138\*\*\*\*8000/); // Masked phone
      expect(safeData.id_card).toContain('***'); // Masked ID card contains asterisks
    });

    test('should show full sensitive data when includeSensitive is true', () => {
      const safeData = testEmployee.toSafeObject(true);

      expect(safeData.name).toBe('张三');
      expect(safeData.phone).toBe('13800138000');
      expect(safeData.id_card).toBe('110101199001011234');
    });

    test('should include all standard fields', () => {
      const safeData = testEmployee.toSafeObject(false);

      expect(safeData.employee_id).toBeDefined();
      expect(safeData.employee_number).toBe('TEST001');
      expect(safeData.email).toBe('test@company.com');
      expect(safeData.status).toBe('active');
      expect(safeData.entry_date).toBe('2024-01-15');
      expect(safeData.department_id).toBe(testDepartment.department_id);
    });
  });

  describe('Encryption and Decryption', () => {
    let testEmployee;

    beforeEach(async () => {
      testEmployee = await Employee.create({
        employee_number: 'ENC001',
        email: 'enc@company.com',
        department_id: testDepartment.department_id,
        status: 'active'
      });
    });

    afterEach(async () => {
      if (testEmployee) {
        await testEmployee.destroy();
      }
    });

    test('should encrypt and decrypt name correctly', async () => {
      const plainName = '李四';
      testEmployee.setName(plainName);
      await testEmployee.save();

      const decrypted = testEmployee.getName();
      expect(decrypted).toBe(plainName);
    });

    test('should encrypt and decrypt phone correctly', async () => {
      const plainPhone = '13900139000';
      testEmployee.setPhone(plainPhone);
      await testEmployee.save();

      const decrypted = testEmployee.getPhone();
      expect(decrypted).toBe(plainPhone);
    });

    test('should encrypt and decrypt ID card correctly', async () => {
      const plainIdCard = '110101199001011234';
      testEmployee.setIdCard(plainIdCard);
      await testEmployee.save();

      const decrypted = testEmployee.getIdCard();
      expect(decrypted).toBe(plainIdCard);
    });

    test('should mask phone number correctly', () => {
      testEmployee.setPhone('13800138000');
      const masked = testEmployee.getMaskedPhone();
      expect(masked).toMatch(/138\*\*\*\*8000/);
    });

    test('should mask ID card correctly', () => {
      testEmployee.setIdCard('110101199001011234');
      const masked = testEmployee.getMaskedIdCard();
      expect(masked).toContain('110'); // Should start with first 3 digits
      expect(masked).toContain('***'); // Should contain asterisks
      expect(masked).toContain('1234'); // Should end with last 4 digits
    });
  });

  describe('Data Validation', () => {
    test('should require employee_number', async () => {
      await expect(
        Employee.create({
          email: 'test@company.com',
          department_id: testDepartment.department_id
        })
      ).rejects.toThrow();
    });

    test('should validate unique employee_number', async () => {
      await Employee.create({
        employee_number: 'UNIQUE001',
        email: 'test1@company.com',
        department_id: testDepartment.department_id
      });

      await expect(
        Employee.create({
          employee_number: 'UNIQUE001',
          email: 'test2@company.com',
          department_id: testDepartment.department_id
        })
      ).rejects.toThrow();

      // Clean up
      await Employee.destroy({ where: { employee_number: 'UNIQUE001' } });
    });
  });

  describe('Work Years Calculation', () => {
    test('should calculate work years correctly', async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const employee = await Employee.create({
        employee_number: 'WORK001',
        email: 'work@company.com',
        department_id: testDepartment.department_id,
        entry_date: oneYearAgo.toISOString().split('T')[0]
      });

      const workYears = employee.getWorkYears();
      expect(workYears).toBeGreaterThanOrEqual(0.9);
      expect(workYears).toBeLessThanOrEqual(1.1);

      await employee.destroy();
    });

    test('should return null for missing entry_date', async () => {
      const employee = await Employee.create({
        employee_number: 'NODATE001',
        email: 'nodate@company.com',
        department_id: testDepartment.department_id
      });

      expect(employee.getWorkYears()).toBeNull();

      await employee.destroy();
    });
  });
});
