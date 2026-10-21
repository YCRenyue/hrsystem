/**
 * EmployeeStatusService.deactivate 单元测试
 *
 * 办理离职：写离职日期、状态改为离职、停用登录账号、结算年假
 */

const EmployeeStatusService = require('../../services/EmployeeStatusService');
const annualLeaveService = require('../../services/AnnualLeaveService');
const { Employee, User } = require('../../models');

const buildEmployee = (status) => {
  const employee = Employee.build({
    employee_id: 'e1', employee_number: 'E001', department_id: 'd1', status
  });
  jest.spyOn(employee, 'save').mockResolvedValue(employee);
  return employee;
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('deactivate', () => {
  test('在职员工办理离职后停用账号并结算年假', async () => {
    const employee = buildEmployee('active');
    jest.spyOn(Employee, 'findByPk').mockResolvedValue(employee);
    const userSpy = jest.spyOn(User, 'update').mockResolvedValue([1]);
    const settleSpy = jest.spyOn(annualLeaveService, 'settleOnOffboarding').mockResolvedValue(null);

    const result = await new EmployeeStatusService().deactivate('e1', '2026-10-31');

    expect(result.oldStatus).toBe('active');
    expect(employee.status).toBe('inactive');
    expect(employee.leave_date).toBe('2026-10-31');
    expect(userSpy).toHaveBeenCalledWith(
      { is_active: false, status: 'inactive' },
      { where: { employee_id: 'e1' } }
    );
    expect(settleSpy).toHaveBeenCalledWith(employee, '2026-10-31');
  });

  test('待入职员工也可以办理离职', async () => {
    jest.spyOn(Employee, 'findByPk').mockResolvedValue(buildEmployee('pending'));
    jest.spyOn(User, 'update').mockResolvedValue([1]);
    jest.spyOn(annualLeaveService, 'settleOnOffboarding').mockResolvedValue(null);

    const result = await new EmployeeStatusService().deactivate('e1', '2026-10-31');

    expect(result.newStatus).toBe('inactive');
  });

  test('已离职员工不能重复办理', async () => {
    jest.spyOn(Employee, 'findByPk').mockResolvedValue(buildEmployee('inactive'));

    await expect(new EmployeeStatusService().deactivate('e1', '2026-10-31'))
      .rejects.toThrow('该员工已离职');
  });
});
