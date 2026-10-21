/**
 * ReportService 单元测试
 *
 * 验证报表查询不再引用不存在的列（name、departure_date），
 * 并且输出的员工姓名是解密后的值。
 */

const { Op } = require('sequelize');
const reportService = require('../../services/ReportService');
const {
  Employee, Leave, Attendance
} = require('../../models');

const adminUser = { user_id: 'u1', data_scope: 'all' };

/**
 * 构造一个带姓名的员工实例（姓名经模型 setter 加密）
 */
const buildEmployee = (fields) => {
  const emp = Employee.build({
    employee_number: 'E001',
    department_id: 'd1',
    ...fields
  });
  emp.setName('张三');
  return emp;
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getLeaveReport / getAttendanceReport', () => {
  test('假期报表只查询 name_encrypted，并返回解密姓名', async () => {
    const employee = buildEmployee({ employee_id: 'e1' });
    const leave = {
      leave_id: 'l1', leave_type: 'annual', days: '1', status: 'approved', employee
    };
    const spy = jest.spyOn(Leave, 'findAll').mockResolvedValue([leave]);

    const report = await reportService.getLeaveReport(adminUser, {});

    const attrs = spy.mock.calls[0][0].include[0].attributes;
    expect(attrs).not.toContain('name');
    expect(attrs).toContain('name_encrypted');
    expect(report.leaves[0].employee.name).toBe('张三');
  });

  test('考勤报表只查询 name_encrypted，并返回解密姓名', async () => {
    const employee = buildEmployee({ employee_id: 'e1' });
    const att = { attendance_id: 'a1', status: 'normal', employee };
    const spy = jest.spyOn(Attendance, 'findAll').mockResolvedValue([att]);

    const report = await reportService.getAttendanceReport(adminUser, {});

    const attrs = spy.mock.calls[0][0].include[0].attributes;
    expect(attrs).not.toContain('name');
    expect(report.attendances[0].employee.name).toBe('张三');
  });
});

describe('getOnboardingOffboardingReport', () => {
  test('离职报表按 leave_date 筛选和排序', async () => {
    const employee = buildEmployee({
      employee_id: 'e1', status: 'inactive', leave_date: '2026-10-15'
    });
    const spy = jest.spyOn(Employee, 'findAll').mockResolvedValue([employee]);

    const report = await reportService.getOnboardingOffboardingReport(adminUser, {
      start_date: '2026-10-01', end_date: '2026-10-31', report_type: 'offboarding'
    });

    const options = spy.mock.calls[0][0];
    expect(options.where.status).toBe('inactive');
    expect(options.where.leave_date[Op.between]).toEqual(['2026-10-01', '2026-10-31']);
    expect(options.order).toEqual([['leave_date', 'DESC']]);
    expect(report.offboarding.employees[0]).toMatchObject({
      name: '张三',
      departure_date: '2026-10-15'
    });
    expect(report.offboarding.byMonth).toEqual([{ month: '2026-10', count: 1 }]);
  });
});
