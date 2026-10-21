/**
 * employeeSearch 单元测试：工号或姓名模糊搜索
 */

const { Op } = require('sequelize');
const { buildEmployeeKeywordWhere } = require('../../utils/employeeSearch');
const { Employee } = require('../../models');

const buildEmployee = (id, name) => {
  const emp = Employee.build({ employee_id: id, employee_number: id, department_id: 'd1' });
  emp.setName(name);
  return emp;
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('buildEmployeeKeywordWhere', () => {
  test('姓名命中的员工按 employee_id 加入搜索条件', async () => {
    jest.spyOn(Employee, 'findAll').mockResolvedValue([
      buildEmployee('E001', '张三'),
      buildEmployee('E002', '李四')
    ]);

    const where = await buildEmployeeKeywordWhere(' 张 ');

    expect(where[Op.or]).toEqual([
      { employee_number: { [Op.like]: '%张%' } },
      { employee_id: { [Op.in]: ['E001'] } }
    ]);
  });

  test('姓名无命中时只按工号搜索', async () => {
    jest.spyOn(Employee, 'findAll').mockResolvedValue([buildEmployee('E001', '张三')]);

    const where = await buildEmployeeKeywordWhere('E00');

    expect(where[Op.or]).toEqual([{ employee_number: { [Op.like]: '%E00%' } }]);
  });
});
