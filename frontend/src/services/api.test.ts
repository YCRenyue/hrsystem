/**
 * 统一的接口错误处理（services/api.ts）
 *
 * 规则来源：HR 使用手册第 5 章（首次登录或重置后必须先改密）、
 * docs/test-cases/01 AUTH-07/08（未登录、令牌失效要回到登录页）。
 */
import { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from "axios";
import apiClient from "./api";

const originalLocation = window.location;

function failWith(status: number, data: unknown = {}) {
  apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    throw new AxiosError("fail", String(status), config, null, {
      status, statusText: "", data, headers: {}, config,
    });
  };
}

beforeEach(() => {
  // jsdom 不支持真实跳转，换成可读写的对象
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { href: "http://localhost/employees", pathname: "/employees" },
  });
  localStorage.setItem("auth_token", "token-1");
  localStorage.setItem("user_info", JSON.stringify({ username: "u1" }));
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  localStorage.clear();
  jest.restoreAllMocks();
});

test("请求自动带上登录令牌", async () => {
  let seen: string | undefined;
  apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    seen = (config.headers as AxiosHeaders).get("Authorization") as string;
    return { status: 200, statusText: "", data: {}, headers: {}, config };
  };
  await apiClient.get("/employees");
  expect(seen).toBe("Bearer token-1");
});

test("401：清掉本地登录信息并回到登录页", async () => {
  failWith(401);
  await expect(apiClient.get("/employees")).rejects.toBeTruthy();
  expect(localStorage.getItem("auth_token")).toBeNull();
  expect(localStorage.getItem("user_info")).toBeNull();
  expect(window.location.href).toBe("/login");
});

test("登录接口本身返回 401（密码错误）时不跳转，留在登录页显示错误", async () => {
  failWith(401, { message: "用户名或密码错误" });
  await expect(apiClient.post("/auth/login", {})).rejects.toBeTruthy();
  expect(window.location.href).toBe("http://localhost/employees");
  expect(localStorage.getItem("auth_token")).toBe("token-1");
});

test("403 PASSWORD_CHANGE_REQUIRED：标记必须改密并跳到改密页", async () => {
  failWith(403, { code: "PASSWORD_CHANGE_REQUIRED" });
  await expect(apiClient.get("/employees")).rejects.toBeTruthy();
  expect(JSON.parse(localStorage.getItem("user_info") as string)).toMatchObject({
    username: "u1", must_change_password: true,
  });
  expect(window.location.href).toBe("/change-password");
});

test("普通 403（权限不足）不跳转、不清登录信息", async () => {
  failWith(403, { message: "权限不足" });
  await expect(apiClient.get("/users")).rejects.toBeTruthy();
  expect(window.location.href).toBe("http://localhost/employees");
  expect(localStorage.getItem("auth_token")).toBe("token-1");
});
