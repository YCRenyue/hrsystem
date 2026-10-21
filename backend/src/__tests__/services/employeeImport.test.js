/**
 * employeeImportService 单元测试
 *
 * - 离职花名册整体拒收，状态为离职的行作为错误行
 * - 预览（validateRows）不写库，只报告将新建的部门
 * - 部门名归一：“人事部”匹配已有的“人事”
 */

const ExcelJS = require('exceljs');
const {
  parseExcelFile, validateRows, normalizeDeptName
} = require('../../services/employeeImportService');
const { Employee, Department, User } = require('../../models');

const HEADERS = ['公司编号', '姓名', '部门', '状态'];

/**
 * 在内存中构造花名册：第 1 行标题，第 2 行表头，第 3 行起数据
 */
const buildWorkbook = async (title, rows) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');
  sheet.addRow([title]);
  sheet.addRow(HEADERS);
  rows.forEach((r) => sheet.addRow(r));
  return workbook.xlsx.writeBuffer();
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('parseExcelFile', () => {
  test('标题含“离职”的花名册整体拒收', async () => {
    const buffer = await buildWorkbook('2026年离职花名册', [['E001', '张三', '人事', '']]);
    await expect(parseExcelFile(buffer)).rejects.toThrow('系统不支持导入离职花名册');
  });

  test('状态为离职或含“离职”字样的行作为错误行，空状态默认在职', async () => {
    const buffer = await buildWorkbook('花名册', [
      ['E001', '张三', '人事', ''],
      ['E002', '李四', '人事', '离职'],
      ['E003', '王五', '人事', '4月1日离职'],
      ['E004', '赵六', '人事', '在职']
    ]);

    const { parsedRows, parseErrors } = await parseExcelFile(buffer);

    expect(parsedRows.map((r) => [r.employee_number, r.status])).toEqual([
      ['E001', 'active'],
      ['E004', 'active']
    ]);
    expect(parseErrors.map((e) => e.row)).toEqual([4, 5]);
    expect(parseErrors[0].message).toContain('离职人员不支持导入');
  });
});

describe('validateRows', () => {
  test('不创建部门，归一后匹配已有部门，新部门只在结果中列出', async () => {
    jest.spyOn(Employee, 'findAll').mockResolvedValue([]);
    jest.spyOn(User, 'findAll').mockResolvedValue([]);
    jest.spyOn(Department, 'findAll').mockResolvedValue([
      { department_id: 'd-hr', name: '人事' }
    ]);
    const createSpy = jest.spyOn(Department, 'findOrCreate');

    const { validRows, newDepartments } = await validateRows([
      { row: 3, employee_number: 'E001', department_name: '人事部' },
      { row: 4, employee_number: 'E002', department_name: '仓库' },
      { row: 5, employee_number: 'E003', department_name: '仓库部' }
    ]);

    expect(createSpy).not.toHaveBeenCalled();
    expect(validRows[0].department_id).toBe('d-hr');
    expect(validRows[1]).toMatchObject({ department_id: null, new_department_name: '仓库' });
    expect(validRows[2]).toMatchObject({ department_id: null, new_department_name: '仓库' });
    expect(newDepartments).toEqual(['仓库']);
  });
});

describe('normalizeDeptName', () => {
  test('去掉空格和末尾的“部”', () => {
    expect(normalizeDeptName(' 人事 部 ')).toBe('人事');
    expect(normalizeDeptName('销售内勤')).toBe('销售内勤');
    expect(normalizeDeptName('部')).toBe('部');
  });
});
