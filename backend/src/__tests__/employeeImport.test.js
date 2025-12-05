/**
 * Employee Import Test - Test Excel import with actual file format
 */
const ExcelJS = require('exceljs');
const { Employee, Department } = require('../models');
const { sequelize } = require('../config/database');

describe('Employee Excel Import - Real Format', () => {
  let departments;

  beforeAll(async () => {
    await sequelize.sync();

    // Create test departments matching those in sample Excel file
    await Department.destroy({ where: {}, force: true });

    departments = await Department.bulkCreate([
      { name: '技术部', code: 'TECH', description: '技术研发部门' },
      { name: '人力资源部', code: 'HR', description: '人力资源管理部门' },
      { name: '市场部', code: 'MKT', description: '市场营销部门' },
      { name: '财务部', code: 'FIN', description: '财务管理部门' },
      { name: '产品部', code: 'PROD', description: '产品规划部门' },
      { name: '运营部', code: 'OPS', description: '运营管理部门' },
      { name: '销售部', code: 'SALES', description: '销售管理部门' },
      { name: '客服部', code: 'CS', description: '客户服务部门' }
    ]);
  }, 30000);

  beforeEach(async () => {
    await Employee.destroy({ where: {}, force: true });
  });

  /**
   * Parse date value from Excel cell
   */
  const parseExcelDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    if (typeof value === 'number') {
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed) && !/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
        return null;
      }
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    return null;
  };

  it('should parse Excel file with Chinese headers correctly', async () => {
    // Create a test Excel file matching the actual format
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('员工列表');

    // Add headers matching actual Excel file
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

    // Add test data rows
    worksheet.addRow({
      employee_number: 'EMP9001',
      name: '测试员工',
      gender: '男',
      birth_date: '1990-01-15',
      id_card: '110101199001151234',
      phone: '13800000001',
      email: 'test001@company.com',
      department: '技术部',
      position: 'Java工程师',
      entry_date: '2024-01-10',
      status: '在职',
      employment_type: '全职',
      bank_card: '6217001234567890123',
      address: '北京市朝阳区',
      emergency_contact: '张三',
      emergency_phone: '13900000001'
    });

    worksheet.addRow({
      employee_number: 'EMP9002',
      name: '李四',
      gender: '女',
      birth_date: '1992-05-20',
      id_card: '110101199205201234',
      phone: '13800000002',
      email: 'test002@company.com',
      department: '客服部',
      position: '客服专员',
      entry_date: '2024-02-15',
      status: '离职',
      employment_type: '兼职',
      bank_card: '6217009876543210987',
      address: '上海市浦东新区',
      emergency_contact: '王五',
      emergency_phone: '13900000002'
    });

    // Process the worksheet (simulating import logic)
    const results = {
      success_count: 0,
      error_count: 0,
      errors: []
    };

    for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);

      try {
        // Map status from Chinese to English
        const statusValue = row.getCell(11).value?.toString().trim() || '在职';
        const statusMap = {
          待完善: 'pending',
          在职: 'active',
          离职: 'inactive',
          pending: 'pending',
          active: 'active',
          inactive: 'inactive'
        };
        const status = statusMap[statusValue] || 'active';

        // Map employment type from Chinese to English
        const employmentTypeValue = row.getCell(12).value?.toString().trim() || '';
        const employmentTypeMap = {
          全职: 'full_time',
          兼职: 'part_time',
          实习: 'intern',
          合同工: 'contractor'
        };
        const employment_type = employmentTypeMap[employmentTypeValue] || 'full_time';

        // Map gender from Chinese to English
        const genderValue = row.getCell(3).value?.toString().trim() || '';
        const genderMap = {
          男: 'male',
          女: 'female'
        };
        const gender = genderMap[genderValue];

        // Get department name and look up department_id
        const departmentName = row.getCell(8).value?.toString().trim();
        let department_id = null;
        if (departmentName) {
          const department = await Department.findOne({
            where: { name: departmentName }
          });
          department_id = department?.department_id;
        }

        const employeeData = {
          employee_number: row.getCell(1).value?.toString().trim(),
          name: row.getCell(2).value?.toString().trim(),
          gender,
          birth_date: parseExcelDate(row.getCell(4).value),
          id_card: row.getCell(5).value?.toString().trim(),
          phone: row.getCell(6).value?.toString().trim(),
          email: row.getCell(7).value?.toString().trim(),
          department_id,
          position: row.getCell(9).value?.toString().trim(),
          entry_date: parseExcelDate(row.getCell(10).value),
          status,
          employment_type,
          bank_card: row.getCell(13).value?.toString().trim(),
          address: row.getCell(14).value?.toString().trim(),
          emergency_contact: row.getCell(15).value?.toString().trim(),
          emergency_phone: row.getCell(16).value?.toString().trim()
        };

        // Skip empty rows
        if (!employeeData.employee_number && !employeeData.name) {
          continue;
        }

        // Validate required fields
        if (!employeeData.employee_number || !employeeData.name) {
          results.errors.push({
            row: rowNum,
            message: 'Employee number and name are required'
          });
          results.error_count++;
          continue;
        }

        // Validate department exists
        if (!employeeData.department_id) {
          results.errors.push({
            row: rowNum,
            message: `Department "${departmentName}" not found`
          });
          results.error_count++;
          continue;
        }

        // Check if employee already exists
        const existing = await Employee.findOne({
          where: { employee_number: employeeData.employee_number }
        });

        if (existing) {
          results.errors.push({
            row: rowNum,
            message: `Employee ${employeeData.employee_number} already exists`
          });
          results.error_count++;
          continue;
        }

        // Create employee
        const employee = Employee.build({
          employee_number: employeeData.employee_number,
          email: employeeData.email,
          department_id: employeeData.department_id,
          position: employeeData.position,
          employment_type: employeeData.employment_type,
          entry_date: employeeData.entry_date,
          status: employeeData.status,
          gender: employeeData.gender,
          address: employeeData.address,
          emergency_contact: employeeData.emergency_contact,
          emergency_phone: employeeData.emergency_phone,
          created_by: 'test'
        });

        // Set encrypted fields
        if (employeeData.name) employee.setName(employeeData.name);
        if (employeeData.phone) employee.setPhone(employeeData.phone);
        if (employeeData.id_card) employee.setIdCard(employeeData.id_card);
        if (employeeData.bank_card) employee.setBankCard(employeeData.bank_card);
        if (employeeData.birth_date) employee.setBirthDate(employeeData.birth_date);

        await employee.save();
        results.success_count++;
      } catch (error) {
        results.errors.push({
          row: rowNum,
          message: error.message
        });
        results.error_count++;
      }
    }

    // Assertions
    expect(results.success_count).toBe(2);
    expect(results.error_count).toBe(0);
    expect(results.errors).toHaveLength(0);

    // Verify employees were created
    const createdEmployees = await Employee.findAll({
      where: {
        employee_number: ['EMP9001', 'EMP9002']
      }
    });

    expect(createdEmployees).toHaveLength(2);

    // Verify employee 1 data
    const emp1 = createdEmployees.find((e) => e.employee_number === 'EMP9001');
    expect(emp1.getName()).toBe('测试员工');
    expect(emp1.getPhone()).toBe('13800000001');
    expect(emp1.status).toBe('active');
    expect(emp1.employment_type).toBe('full_time');

    // Verify employee 2 data
    const emp2 = createdEmployees.find((e) => e.employee_number === 'EMP9002');
    expect(emp2.getName()).toBe('李四');
    expect(emp2.status).toBe('inactive');
    expect(emp2.employment_type).toBe('part_time');
  });

  it('should handle missing department gracefully', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('员工列表');

    worksheet.columns = [
      { header: '工号', key: 'employee_number' },
      { header: '姓名', key: 'name' },
      { header: '性别', key: 'gender' },
      { header: '出生日期', key: 'birth_date' },
      { header: '身份证号', key: 'id_card' },
      { header: '手机号', key: 'phone' },
      { header: '邮箱', key: 'email' },
      { header: '部门', key: 'department' },
      { header: '职位', key: 'position' },
      { header: '入职日期', key: 'entry_date' },
      { header: '员工状态', key: 'status' },
      { header: '用工类型', key: 'employment_type' }
    ];

    // Add row with non-existent department
    worksheet.addRow({
      employee_number: 'EMP9003',
      name: '王五',
      gender: '男',
      department: '不存在的部门',
      position: '测试职位',
      status: '在职',
      employment_type: '全职'
    });

    const results = { success_count: 0, error_count: 0, errors: [] };

    for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);

      const departmentName = row.getCell(8).value?.toString().trim();
      const department = await Department.findOne({ where: { name: departmentName } });

      if (!department) {
        results.errors.push({
          row: rowNum,
          message: `Department "${departmentName}" not found`
        });
        results.error_count++;
      }
    }

    expect(results.error_count).toBe(1);
    expect(results.errors[0].message).toBe('Department "不存在的部门" not found');
  });
});
