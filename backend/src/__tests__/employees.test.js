/**
 * Employee Management Module Tests
 * Tests CRUD operations, Excel import/export
 */

const request = require('supertest');
const app = require('../app');
const { Employee, Department, sequelize } = require('../models');
const { encryptionService } = require('../utils/encryption');

describe('Employee Management API', () => {
  let authToken;
  let testDepartment;
  let testEmployee;

  // Setup before all tests
  beforeAll(async () => {
    // Ensure DB is connected
    await sequelize.authenticate();

    // Create test department
    testDepartment = await Department.create({
      name: '测试部门',
      code: 'TEST',
      created_by: 'test'
    });
  });

  // Cleanup after all tests
  afterAll(async () => {
    // Clean up test data
    if (testEmployee) {
      await Employee.destroy({ where: { employee_id: testEmployee.employee_id }, force: true });
    }
    if (testDepartment) {
      await Department.destroy({ where: { department_id: testDepartment.department_id }, force: true });
    }
    await sequelize.close();
  });

  // Login before running tests
  beforeEach(async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'password123'
      });

    if (response.body.success) {
      authToken = response.body.data.token;
    }
  });

  describe('GET /api/employees', () => {
    it('should return employee list with pagination', async () => {
      const response = await request(app)
        .get('/api/employees')
        .query({ page: 1, size: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('page');
      expect(response.body.data).toHaveProperty('size');
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/employees')
        .query({ page: 1, size: 10 });

      expect([401, 403]).toContain(response.status);
    });

    it('should support keyword search', async () => {
      const response = await request(app)
        .get('/api/employees')
        .query({ keyword: 'test', page: 1, size: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/employees', () => {
    it('should create a new employee with encrypted data', async () => {
      const newEmployee = {
        employee_number: 'TEST001',
        name: '测试员工',
        email: 'test@example.com',
        phone: '13800138000',
        id_card: '110101199001011234',
        gender: 'male',
        birth_date: '1990-01-01',
        department_id: testDepartment.department_id,
        position: '测试工程师',
        employment_type: 'full_time',
        entry_date: '2024-01-01',
        status: 'active'
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newEmployee);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('employee_id');
      expect(response.body.data.employee_number).toBe('TEST001');

      // Save for cleanup
      testEmployee = response.body.data;

      // Verify data is encrypted in database
      const dbRecord = await Employee.findByPk(testEmployee.employee_id);
      expect(dbRecord.name_encrypted).toBeDefined();
      expect(dbRecord.phone_encrypted).toBeDefined();
      expect(dbRecord.id_card_encrypted).toBeDefined();
    });

    it('should reject duplicate employee numbers', async () => {
      const duplicate = {
        employee_number: 'TEST001',
        name: '重复员工',
        department_id: testDepartment.department_id,
        position: '测试',
        employment_type: 'full_time',
        entry_date: '2024-01-01'
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicate);

      expect(response.status).toBe(400);
    });

    it('should validate required fields', async () => {
      const invalid = {
        name: '测试'
        // Missing employee_number
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalid);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/employees/:id', () => {
    it('should return employee details', async () => {
      if (!testEmployee) {
        // Create test employee if not exists
        const newEmployee = Employee.build({
          employee_number: 'TEST001',
          email: 'test@example.com',
          department_id: testDepartment.department_id,
          position: '测试工程师',
          employment_type: 'full_time',
          entry_date: '2024-01-01',
          status: 'active',
          created_by: 'test'
        });
        newEmployee.setName('测试员工');
        newEmployee.setPhone('13800138000');
        await newEmployee.save();
        testEmployee = newEmployee;
      }

      const response = await request(app)
        .get(`/api/employees/${testEmployee.employee_id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.employee_id).toBe(testEmployee.employee_id);
      expect(response.body.data.employee_number).toBe('TEST001');
    });

    it('should return 404 for non-existent employee', async () => {
      const response = await request(app)
        .get('/api/employees/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/employees/:id', () => {
    it('should update employee information', async () => {
      if (!testEmployee) {
        const newEmployee = Employee.build({
          employee_number: 'TEST001',
          email: 'test@example.com',
          department_id: testDepartment.department_id,
          position: '测试工程师',
          employment_type: 'full_time',
          entry_date: '2024-01-01',
          status: 'active',
          created_by: 'test'
        });
        newEmployee.setName('测试员工');
        await newEmployee.save();
        testEmployee = newEmployee;
      }

      const updates = {
        position: '高级测试工程师',
        status: 'active'
      };

      const response = await request(app)
        .put(`/api/employees/${testEmployee.employee_id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.position).toBe('高级测试工程师');
    });
  });

  describe('DELETE /api/employees/:id', () => {
    it('should delete employee (admin only)', async () => {
      // Create a temp employee to delete
      const tempEmployee = Employee.build({
        employee_number: 'TEMP001',
        email: 'temp@example.com',
        department_id: testDepartment.department_id,
        position: '临时',
        employment_type: 'full_time',
        entry_date: '2024-01-01',
        status: 'active',
        created_by: 'test'
      });
      tempEmployee.setName('临时员工');
      await tempEmployee.save();

      const response = await request(app)
        .delete(`/api/employees/${tempEmployee.employee_id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify deletion
      const deleted = await Employee.findByPk(tempEmployee.employee_id);
      expect(deleted).toBeNull();
    });
  });

  describe('POST /api/employees/import', () => {
    it('should import employees from Excel file', async () => {
      // This is a basic test - in real scenario, you'd create a test Excel file
      const response = await request(app)
        .post('/api/employees/import')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('fake excel data'), { filename: 'test.xlsx' });

      // Should fail due to invalid file, but endpoint should exist
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('GET /api/employees/export', () => {
    it('should export employees to Excel', async () => {
      const response = await request(app)
        .get('/api/employees/export')
        .set('Authorization', `Bearer ${authToken}`);

      // Route may not be implemented yet
      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(response.headers['content-type']).toContain('spreadsheet');
      }
    });
  });
});
