/**
 * 前端权限判断（contexts/PermissionContext.tsx、components/Permission/Can.tsx）
 *
 * 规则来源：CLAUDE.md 三级权限（admin/HR 全部、部门负责人本部门、员工仅本人），
 * 权限通配：'*' 全部、'employees.*' 匹配 employees 下所有权限。
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { PermissionProvider, usePermission } from "./PermissionContext";
import { Can } from "../components/Permission/Can";

let mockUser: any = null;
jest.mock("./AuthContext", () => ({ useAuth: () => ({ user: mockUser }) }));

function Probe() {
  const p = usePermission();
  return (
    <div>
      <span data-testid="import">{String(p.hasPermission("employees.import"))}</span>
      <span data-testid="dept-a">{String(p.canViewDepartment("dept-a"))}</span>
      <span data-testid="dept-b">{String(p.canViewDepartment("dept-b"))}</span>
      <span data-testid="admin">{String(p.isAdmin)}</span>
    </div>
  );
}

const renderAs = (user: any) => {
  mockUser = user;
  render(
    <PermissionProvider>
      <Probe />
      <Can permission="employees.import" fallback={<span>no-import</span>}>
        <span>import-button</span>
      </Can>
    </PermissionProvider>
  );
  const text = (id: string) => screen.getByTestId(id).textContent;
  return {
    import: text("import"), deptA: text("dept-a"), deptB: text("dept-b"), admin: text("admin"),
  };
};

test("超级管理员 '*'：所有权限、所有部门", () => {
  expect(renderAs({ role: "admin", data_scope: "all", permissions: ["*"] })).toEqual({
    import: "true", deptA: "true", deptB: "true", admin: "true",
  });
  expect(screen.getByText("import-button")).toBeInTheDocument();
});

test("HR：按权限列表显示导入按钮，可看所有部门", () => {
  expect(renderAs({
    role: "hr_admin", data_scope: "all", permissions: ["employees.import", "employees.export"],
  })).toEqual({ import: "true", deptA: "true", deptB: "true", admin: "true" });
});

test("通配 employees.* 匹配 employees.import", () => {
  expect(renderAs({ role: "hr_admin", data_scope: "all", permissions: ["employees.*"] }).import)
    .toBe("true");
});

test("部门负责人：只能看本部门，看不到导入按钮", () => {
  expect(renderAs({
    role: "department_manager", data_scope: "department", department_id: "dept-a",
    permissions: ["employees.view_department"],
  })).toEqual({ import: "false", deptA: "true", deptB: "false", admin: "false" });
  expect(screen.getByText("no-import")).toBeInTheDocument();
});

test("员工：不能看部门级数据，没有导入权限", () => {
  expect(renderAs({ role: "employee", data_scope: "self", permissions: ["employees.view_self"] }))
    .toEqual({ import: "false", deptA: "false", deptB: "false", admin: "false" });
});

test("未登录：什么都没有", () => {
  expect(renderAs(null)).toEqual({ import: "false", deptA: "false", deptB: "false", admin: "false" });
});
