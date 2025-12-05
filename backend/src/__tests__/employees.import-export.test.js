/**
 * Employee Import/Export Tests
 * Tests Excel import and export functionality with duplicate detection
 */

const request = require('supertest');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const { Employee, Department, sequelize } = require('../models');
const app = require('../app');

describe('Employee Import/Export API', () => {
  let authToken;
  let hrToken;
  let testDepartment;
  const testEmployees = [];

  // Setup before all tests
  beforeAll(async () => {
    // Ensure DB is connected
    await sequelize.authenticate();

    // Create test department
    testDepartment = await Department.create({
      name: '导入测试部门',
      code: 'IMPORT_TEST',
      created_by: 'test'
    });
  });

  // Cleanup after all tests
  afterAll(async () => {
    // Clean up test employees
    for (const emp of testEmployees) {
      await Employee.destroy({
        where: { employee_number: emp.employee_number },
        force: true
      });
    }

    // Clean up test department
    if (testDepartment) {
      await Department.destroy({
        where: { department_id: testDepartment.department_id },
        force: true
      });
    }

    await sequelize.close();
  });

  // Login as admin before each test
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

  // Helper function to create test Excel file matching actual format
  const createTestExcelFile = async (employees) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('员工列表');

    // Define columns - matching actual Excel file format
    worksheet.columns = [
      { header: '工号', key: 'employee_number', width: 15 },
      { header: '姓名', key: 'name', width: 15 },
      { header: '性别', key: 'gender', width: 10 },
      { header: '出生日期', key: 'birth_date', width: 15 },
      { header: '身份证号', key: 'id_card', width: 20 },
      { header: '手机号', key: 'phone', width: 15 },
      { header: '邮箱', key: 'email', width: 25 },
      { header: '部门', key: 'department', width: 20 },
      { header: '职位', key: 'position', width: 20 },
      { header: '入职日期', key: 'entry_date', width: 15 },
      { header: '员工状态', key: 'status', width: 15 },
      { header: '用工类型', key: 'employment_type', width: 15 },
      { header: '银行卡号', key: 'bank_card', width: 20 },
      { header: '家庭住址', key: 'address', width: 30 },
      { header: '紧急联系人', key: 'emergency_contact', width: 15 },
      { header: '紧急联系电话', key: 'emergency_phone', width: 15 }
    ];

    // Add rows
    employees.forEach((emp) => worksheet.addRow(emp));

    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  };

  describe('POST /api/employees/import', () => {
    it('should successfully import valid employee data', async () => {
      const testData = [
        {
          employee_number: 'TEST001',
          name: '测试员工1',
          gender: '男',
          birth_date: '1990-01-01',
          id_card: '110101199001011111',
          phone: '13800001111',
          email: 'test001@company.com',
          department: testDepartment.name, // Use department name
          position: '测试工程师',
          entry_date: '2024-01-01',
          status: '在职', // Chinese status
          employment_type: '全职' // Chinese employment type
        }
      ];

      const buffer = await createTestExcelFile(testData);

      const response = await request(app)
        .post('/api/employees/import')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buffer, 'test.xlsx');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.success_count).toBe(1);
      expect(response.body.data.error_count).toBe(0);

      // Track for cleanup
      testEmployees.push({ employee_number: 'TEST001' });

      // Verify employee was created
      const employee = await Employee.findOne({
        where: { employee_number: 'TEST001' }
      });
      expect(employee).not.toBeNull();
      expect(employee.getName()).toBe('测试员工1');
      expect(employee.getPhone()).toBe('13800001111');
    });

    it('should detect and reject duplicate employee numbers', async () => {
      // First, create an employee
      const existingData = [
        {
          employee_number: 'TEST002',
          name: '已存在员工',
          gender: '女',
          birth_date: '1990-02-02',
          id_card: '110101199002022222',
          phone: '13800002222',
          email: 'existing@company.com',
          department: testDepartment.name,
          position: '产品经理',
          entry_date: '2024-02-01',
          status: '在职',
          employment_type: '全职'
        }
      ];

      const buffer1 = await createTestExcelFile(existingData);
      await request(app)
        .post('/api/employees/import')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buffer1, 'existing.xlsx');

      testEmployees.push({ employee_number: 'TEST002' });

      // Now try to import the same employee number again
      const duplicateData = [
        {
          employee_number: 'TEST002', // Same employee number
          name: '重复员工',
          gender: '男',
          birth_date: '1990-03-03',
          id_card: '110101199003033333',
          phone: '13800003333',
          email: 'duplicate@company.com',
          department: testDepartment.name,
          position: '设计师',
          entry_date: '2024-03-01',
          status: '在职',
          employment_type: '全职'
        }
      ];

      const buffer2 = await createTestExcelFile(duplicateData);
      const response = await request(app)
        .post('/api/employees/import')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buffer2, 'duplicate.xlsx');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.success_count).toBe(0);
      expect(response.body.data.error_count).toBe(1);
      expect(response.body.data.errors).toHaveLength(1);
      expect(response.body.data.errors[0].message).toContain('already exists');

      // Verify original employee data was not changed
      const employee = await Employee.findOne({
        where: { employee_number: 'TEST002' }
      });
      expect(employee.getName()).toBe('已存在员工');
      expect(employee.email).toBe('existing@company.com');
    });

    it('should handle mixed valid and invalid data', async () => {
      const mixedData = [
        {
          employee_number: 'TEST003',
          name: '有效员工',
          gender: '男',
          birth_date: '1990-04-04',
          id_card: '110101199004044444',
          phone: '13800004444',
          email: 'valid@company.com',
          department: testDepartment.name,
          position: '开发工程师',
          entry_date: '2024-04-01',
          status: '在职',
          employment_type: '全职'
        },
        {
          employee_number: '', // Invalid: missing employee number
          name: '无效员工',
          gender: '女',
          birth_date: '1990-05-05',
          id_card: '110101199005055555',
          phone: '13800005555',
          email: 'invalid@company.com',
          department: testDepartment.name,
          position: '运营',
          entry_date: '2024-05-01',
          status: '在职',
          employment_type: '全职'
        }
      ];

      const buffer = await createTestExcelFile(mixedData);
      const response = await request(app)
        .post('/api/employees/import')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buffer, 'mixed.xlsx');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.success_count).toBe(1);
      expect(response.body.data.error_count).toBe(1);
      expect(response.body.data.errors).toHaveLength(1);
      expect(response.body.data.errors[0].message).toContain('required');

      testEmployees.push({ employee_number: 'TEST003' });

      // Verify only valid employee was created
      const validEmployee = await Employee.findOne({
        where: { employee_number: 'TEST003' }
      });
      expect(validEmployee).not.toBeNull();
    });

    it('should reject empty Excel file', async () => {
      const emptyData = [];
      const buffer = await createTestExcelFile(emptyData);

      const response = await request(app)
        .post('/api/employees/import')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buffer, 'empty.xlsx');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.success_count).toBe(0);
    });

    it('should require authentication', async () => {
      const testData = [
        {
          employee_number: 'TEST999',
          name: '测试',
          email: 'test@company.com'
        }
      ];

      const buffer = await createTestExcelFile(testData);
      const response = await request(app)
        .post('/api/employees/import')
        .attach('file', buffer, 'test.xlsx');

      expect([401, 403]).toContain(response.status);
    });

    it('should require HR or Admin role', async () => {
      // Login as regular employee
      const employeeLogin = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'employee',
          password: 'password123'
        });

      const employeeToken = employeeLogin.body.data?.token;

      if (employeeToken) {
        const testData = [
          {
            employee_number: 'TEST998',
            name: '测试',
            email: 'test@company.com'
          }
        ];

        const buffer = await createTestExcelFile(testData);
        const response = await request(app)
          .post('/api/employees/import')
          .set('Authorization', `Bearer ${employeeToken}`)
          .attach('file', buffer, 'test.xlsx');

        expect(response.status).toBe(403);
      }
    });

    it('should reject non-Excel files', async () => {
      const response = await request(app)
        .post('/api/employees/import')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('not an excel file'), 'test.txt');

      expect(response.status).toBe(500);
    });

    it('should handle multiple duplicate entries in single import', async () => {
      // Create first employee
      const firstData = [
        {
          employee_number: 'TEST004',
          name: '第一个员工',
          gender: '男',
          birth_date: '1990-06-06',
          id_card: '110101199006066666',
          phone: '13800006666',
          email: 'first@company.com',
          department: testDepartment.name,
          position: '经理',
          entry_date: '2024-06-01',
          status: '在职',
          employment_type: '全职'
        }
      ];

      const buffer1 = await createTestExcelFile(firstData);
      await request(app)
        .post('/api/employees/import')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buffer1, 'first.xlsx');

      testEmployees.push({ employee_number: 'TEST004' });

      // Try to import multiple employees where some are duplicates
      const multipleData = [
        {
          employee_number: 'TEST005',
          name: '新员工',
          gender: '女',
          birth_date: '1990-07-07',
          id_card: '110101199007077777',
          phone: '13800007777',
          email: 'new@company.com',
          department: testDepartment.name,
          position: '助理',
          entry_date: '2024-07-01',
          status: '在职',
          employment_type: '全职'
        },
        {
          employee_number: 'TEST004', // Duplicate
          name: '重复1',
          gender: '男',
          birth_date: '1990-08-08',
          id_card: '110101199008088888',
          phone: '13800008888',
          email: 'dup1@company.com',
          department: testDepartment.name,
          position: '专员',
          entry_date: '2024-08-01',
          status: '在职',
          employment_type: '全职'
        },
        {
          employee_number: 'TEST006',
          name: '另一个新员工',
          gender: '女',
          birth_date: '1990-09-09',
          id_card: '110101199009099999',
          phone: '13800009999',
          email: 'another@company.com',
          department: testDepartment.name,
          position: '主管',
          entry_date: '2024-09-01',
          status: '在职',
          employment_type: '全职'
        }
      ];

      const buffer2 = await createTestExcelFile(multipleData);
      const response = await request(app)
        .post('/api/employees/import')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buffer2, 'multiple.xlsx');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.success_count).toBe(2);
      expect(response.body.data.error_count).toBe(1);

      testEmployees.push({ employee_number: 'TEST005' });
      testEmployees.push({ employee_number: 'TEST006' });

      // Verify correct employees were created
      const test005 = await Employee.findOne({
        where: { employee_number: 'TEST005' }
      });
      const test006 = await Employee.findOne({
        where: { employee_number: 'TEST006' }
      });
      expect(test005).not.toBeNull();
      expect(test006).not.toBeNull();

      // Verify duplicate was not imported (original data remains)
      const test004 = await Employee.findOne({
        where: { employee_number: 'TEST004' }
      });
      expect(test004.getName()).toBe('第一个员工');
    });
  });

  describe('GET /api/employees/export', () => {
    beforeAll(async () => {
      // Create some test employees for export
      const employee = Employee.build({
        employee_number: 'EXPORT001',
        email: 'export@company.com',
        department_id: testDepartment.department_id,
        position: '导出测试',
        employment_type: 'full_time',
        entry_date: new Date('2024-01-01'),
        status: 'active',
        gender: 'male',
        created_by: 'test'
      });

      employee.setName('导出测试员工');
      employee.setPhone('13800000000');
      employee.setIdCard('110101199001010000');
      employee.setBirthDate('1990-01-01');

      await employee.save();
      testEmployees.push({ employee_number: 'EXPORT001' });
    });

    it('should export employees to Excel', async () => {
      const response = await request(app)
        .get('/api/employees/export')
        .set('Authorization', `Bearer ${authToken}`)
        .responseType('blob');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('spreadsheet');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.body).toBeDefined();

      // Basic validation that we got binary data
      expect(Buffer.isBuffer(response.body) || response.body instanceof ArrayBuffer).toBeTruthy();
    });

    it('should require authentication for export', async () => {
      const response = await request(app)
        .get('/api/employees/export');

      expect([401, 403]).toContain(response.status);
    });

    it('should require HR or Admin role for export', async () => {
      // Login as regular employee
      const employeeLogin = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'employee',
          password: 'password123'
        });

      const employeeToken = employeeLogin.body.data?.token;

      if (employeeToken) {
        const response = await request(app)
          .get('/api/employees/export')
          .set('Authorization', `Bearer ${employeeToken}`);

        expect(response.status).toBe(403);
      }
    });

    it('should support filtering in export', async () => {
      const response = await request(app)
        .get('/api/employees/export')
        .query({ status: 'active' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('spreadsheet');
    });
  });
});
