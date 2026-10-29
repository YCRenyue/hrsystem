/**
 * 各模块的数据范围：员工只看自己，部门负责人只看本部门，HR/admin 看全部
 *
 * 规则来源：CLAUDE.md“三级权限系统”、requirement.md 12.1（年假：employee 查看个人）、
 * 12.2（社保：department_manager 仅查看，employee 仅查看个人记录）、12.4 就餐。
 */
const app = require('../../app');
const {
  SocialSecurity, CanteenMeal, AnnualLeave, Attendance
} = require('../../models');
const { setupTestDb, resetTestDb, closeTestDb } = require('../helpers/testDb');
const { createOrg } = require('../helpers/fixtures');

beforeAll(setupTestDb, 300000);
beforeEach(resetTestDb);
afterAll(closeTestDb);

const money = {
  social_security_base: 5000,
  housing_fund_base: 5000,
  pension_personal: 400,
  pension_company: 800,
  medical_personal: 100,
  medical_company: 500,
  unemployment_personal: 25,
  unemployment_company: 25,
  injury_company: 20,
  maternity_company: 40,
  housing_fund_personal: 250,
  housing_fund_company: 250,
  total_personal: 775,
  total_company: 1635,
  payment_status: 'paid'
};

let org;
const records = {};
beforeEach(async () => {
  org = await createOrg(app);
  const people = { staff: org.staffEmp, other: org.otherEmp };
  // eslint-disable-next-line no-restricted-syntax
  for (const [key, emp] of Object.entries(people)) {
    const id = { employee_id: emp.employee_id };
    records[key] = {
      /* eslint-disable no-await-in-loop */
      social: await SocialSecurity.create({ ...id, year_month: '2026-09', ...money }),
      meal: await CanteenMeal.create({
        ...id,
        meal_date: '2026-09-01',
        meal_type: 'lunch',
        location_type: 'canteen',
        amount: 0,
        subsidy_amount: 0,
        payment_method: 'card',
        is_subsidized: false
      }),
      annual: await AnnualLeave.create({
        ...id, year: 2026, total_days: 5, used_days: 0, remaining_days: 5
      }),
      attendance: await Attendance.create({ ...id, date: '2026-09-01', status: 'normal' })
      /* eslint-enable no-await-in-loop */
    };
  }
});

const rowsOf = (res) => {
  const { data } = res.body;
  return Array.isArray(data) ? data : (data.rows || data.records || data.list || []);
};
const ownerIds = (res) => rowsOf(res).map((r) => r.employee_id || (r.employee && r.employee.employee_id))
  .sort();

describe('员工只能看到自己的记录', () => {
  test('年假列表', async () => {
    const res = await org.as.staff.get('/api/annual-leave');
    expect(ownerIds(res)).toEqual([org.staffEmp.employee_id]);
  });

  test('考勤列表', async () => {
    const res = await org.as.staff.get('/api/attendances');
    expect(ownerIds(res)).toEqual([org.staffEmp.employee_id]);
  });

  // 回归（测试发现并已修复）：社保列表没有任何数据范围过滤，任何登录用户都能看到全员社保基数和缴纳金额。
  test('社保列表', async () => {
    const res = await org.as.staff.get('/api/social-security');
    expect(ownerIds(res)).toEqual([org.staffEmp.employee_id]);
  });

  test('社保详情：查看别人的记录被拒绝', async () => {
    const pk = SocialSecurity.primaryKeyAttribute;
    const res = await org.as.staff.get(`/api/social-security/${records.other.social[pk]}`);
    expect(res.status).toBe(403);
  });

  // 回归（测试发现并已修复）：就餐列表和详情同样没有数据范围过滤。
  test('就餐列表', async () => {
    const res = await org.as.staff.get('/api/canteen-meals');
    expect(ownerIds(res)).toEqual([org.staffEmp.employee_id]);
  });

  test('年假详情：查看别人的记录被拒绝', async () => {
    const pk = AnnualLeave.primaryKeyAttribute;
    const res = await org.as.staff.get(`/api/annual-leave/${records.other.annual[pk]}`);
    expect(res.status).toBe(403);
  });
});

describe('部门负责人只能看到本部门', () => {
  test('年假列表', async () => {
    const res = await org.as.manager.get('/api/annual-leave');
    expect(ownerIds(res)).toEqual([org.staffEmp.employee_id]);
  });

  test('考勤列表', async () => {
    const res = await org.as.manager.get('/api/attendances');
    expect(ownerIds(res)).toEqual([org.staffEmp.employee_id]);
  });

  test('社保列表', async () => {
    const res = await org.as.manager.get('/api/social-security');
    expect(ownerIds(res)).toEqual([org.staffEmp.employee_id]);
  });
});

describe('HR 看全部', () => {
  test.each(['/api/annual-leave', '/api/attendances', '/api/social-security', '/api/canteen-meals'])(
    '%s',
    async (url) => {
      const res = await org.as.hr.get(url);
      expect(res.status).toBe(200);
      expect(ownerIds(res)).toHaveLength(2);
    }
  );
});

describe('写操作只给 HR/admin', () => {
  test.each([
    ['post', '/api/social-security'],
    ['post', '/api/annual-leave'],
    ['post', '/api/canteen-meals']
  ])('员工 %s %s -> 403', async (method, url) => {
    expect((await org.as.staff[method](url).send({})).status).toBe(403);
  });

  test('部门负责人不能改社保', async () => {
    const pk = SocialSecurity.primaryKeyAttribute;
    const res = await org.as.manager.put(`/api/social-security/${records.staff.social[pk]}`)
      .send({ social_security_base: 1 });
    expect(res.status).toBe(403);
  });
});

// 回归（测试发现并已修复）：GET /api/attendances/:id 路由指向 attendanceController.getAttendanceById，
// 但控制器里没有这个函数，请求会以 500 结束。
test('GET /api/attendances/:id 能正常返回或 404，而不是 500', async () => {
  const pk = Attendance.primaryKeyAttribute;
  const res = await org.as.hr.get(`/api/attendances/${records.staff.attendance[pk]}`);
  expect(res.status).not.toBe(500);
});
