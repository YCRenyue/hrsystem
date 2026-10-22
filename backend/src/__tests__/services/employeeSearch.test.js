/**
 * employeeSearch 单元测试：工号或姓名模糊搜索
 */

const { Op } = require('sequelize');
const {
  buildEmployeeKeywordWhere,
  applyEmployeeKeyword,
  applyEmployeeFilters
} = require('../../utils/employeeSearch');
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

describe('applyEmployeeKeyword', () => {
  test('保留原有的数据范围条件，并与搜索条件同时生效', async () => {
    jest.spyOn(Employee, 'findAll').mockResolvedValue([buildEmployee('E001', '张三')]);
    const include = { where: { department_id: 'd1' } };

    await applyEmployeeKeyword(include, '张三');

    expect(include.where[Op.and][0]).toEqual({ department_id: 'd1' });
    expect(include.where[Op.and][1][Op.or]).toContainEqual({ employee_id: { [Op.in]: ['E001'] } });
  });

  test('关键字为空时不修改条件', async () => {
    const include = { where: { department_id: 'd1' } };
    await applyEmployeeKeyword(include, '  ');
    expect(include.where).toEqual({ department_id: 'd1' });
  });
});

describe('applyEmployeeFilters', () => {
  test('工号和姓名分开填写时同时生效', async () => {
    jest.spyOn(Employee, 'findAll').mockResolvedValue([
      buildEmployee('E001', '张三'),
      buildEmployee('E002', '张四')
    ]);
    const include = { where: { department_id: 'd1' } };

    await applyEmployeeFilters(include, { employeeNumber: ' E00 ', name: '张三' });

    expect(include.where[Op.and]).toEqual([
      { department_id: 'd1' },
      { employee_number: { [Op.like]: '%E00%' } },
      { employee_id: { [Op.in]: ['E001'] } }
    ]);
  });

  test('姓名无命中时不返回任何员工', async () => {
    jest.spyOn(Employee, 'findAll').mockResolvedValue([buildEmployee('E001', '张三')]);
    const include = {};

    await applyEmployeeFilters(include, { name: '王五' });

    expect(include.where).toEqual({ employee_id: { [Op.in]: [] } });
  });
});
