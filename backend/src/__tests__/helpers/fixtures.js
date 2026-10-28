/**
 * Fictional test data builders for integration tests. Never put real employee data here.
 */
const request = require('supertest');
const { Department, Employee, User } = require('../../models');
const { encryptionService } = require('../../utils/encryption');

let seq = 0;
let passwordHash = null;
const DEFAULT_PASSWORD = 'Passw0rd!';
const next = () => { seq += 1; return seq; };

const ROLE_SCOPE = {
  admin: 'all', hr_admin: 'all', finance: 'all', department_manager: 'department', employee: 'self'
};

async function createDepartment(attrs = {}) {
  const n = next();
  return Department.create({ name: `Dept${n}`, code: `D${n}`, ...attrs });
}

/**
 * Create an employee. Plain `name`, `phone` and `idCard` are encrypted the same way the app does.
 */
async function createEmployee({
  name, phone, idCard, ...attrs
} = {}) {
  const n = next();
  const employee = Employee.build({
    employee_number: `T${String(n).padStart(4, '0')}`,
    entry_date: '2024-01-01',
    status: 'active',
    ...attrs
  });
  employee.setName(name || `Tester${n}`);
  if (phone) employee.setPhone(phone);
  if (idCard) employee.setIdCard(idCard);
  return employee.save();
}

/**
 * Create a login account. data_scope defaults to what the role implies.
 */
async function createUser({
  role = 'employee', employee = null, departmentId, ...attrs
} = {}) {
  const n = next();
  // bcrypt is slow on purpose; hash the shared test password once per test file
  if (!passwordHash) passwordHash = await encryptionService.hashPassword(DEFAULT_PASSWORD);
  return User.create({
    username: `user${n}`,
    password_hash: passwordHash,
    role,
    data_scope: ROLE_SCOPE[role],
    employee_id: employee ? employee.employee_id : null,
    department_id: departmentId !== undefined ? departmentId : (employee && employee.department_id),
    ...attrs
  });
}

/** Log in through the real endpoint and return an authorised supertest agent wrapper. */
async function loginAs(app, user, password = DEFAULT_PASSWORD) {
  const res = await request(app).post('/api/auth/login').send({ username: user.username, password });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  const token = res.body.data ? res.body.data.token : res.body.token;
  const auth = (r) => r.set('Authorization', `Bearer ${token}`);
  return {
    token,
    get: (url) => auth(request(app).get(url)),
    post: (url) => auth(request(app).post(url)),
    put: (url) => auth(request(app).put(url)),
    patch: (url) => auth(request(app).patch(url)),
    delete: (url) => auth(request(app).delete(url))
  };
}

/**
 * Typical organisation: one department with a manager and an employee, plus HR, admin, finance and
 * an employee in another department.
 */
async function createOrg(app) {
  const dept = await createDepartment({ name: 'Sales' });
  const otherDept = await createDepartment({ name: 'Production' });
  const managerEmp = await createEmployee({ name: 'Manager Wang', department_id: dept.department_id });
  const staffEmp = await createEmployee({ name: 'Staff Li', department_id: dept.department_id });
  const otherEmp = await createEmployee({ name: 'Other Zhao', department_id: otherDept.department_id });
  const hrEmp = await createEmployee({ name: 'HR Chen', department_id: otherDept.department_id });
  await dept.update({ manager_id: managerEmp.employee_id }).catch(() => {});
  const users = {
    admin: await createUser({ role: 'admin' }),
    hr: await createUser({ role: 'hr_admin', employee: hrEmp }),
    finance: await createUser({ role: 'finance' }),
    manager: await createUser({ role: 'department_manager', employee: managerEmp }),
    staff: await createUser({ role: 'employee', employee: staffEmp }),
    other: await createUser({ role: 'employee', employee: otherEmp })
  };
  const as = {};
  // eslint-disable-next-line no-restricted-syntax
  for (const [key, user] of Object.entries(users)) {
    // eslint-disable-next-line no-await-in-loop
    as[key] = await loginAs(app, user);
  }
  return {
    dept, otherDept, managerEmp, staffEmp, otherEmp, hrEmp, users, as
  };
}

module.exports = {
  createDepartment, createEmployee, createUser, loginAs, createOrg
};
