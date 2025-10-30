# Frontend Development Guide

## 已完成的功能

### 核心基础设施
- ✅ 项目目录结构（components, pages, services, types, utils）
- ✅ TypeScript 类型定义（Employee, User, Department, OnboardingProcess）
- ✅ Axios API 服务层配置（拦截器、错误处理）
- ✅ 认证上下文（AuthContext）和受保护路由
- ✅ 主布局组件（侧边栏导航、顶部栏、用户菜单）

### 已实现的页面

#### 1. 登录页面 (`/login`)
- 用户名/密码登录表单
- 钉钉 OAuth 登录按钮（占位符）
- 响应式设计，支持移动端
- 自动跳转到 Dashboard

#### 2. Dashboard (`/dashboard`)
- 统计卡片展示：总员工数、部门数、入职中、完成率
- 活动动态占位符
- 待办任务占位符

#### 3. 员工列表页面 (`/employees`)
- 分页表格展示所有员工
- 搜索功能（姓名、邮箱、工号）
- 状态筛选器（Pending, Probation, Regular, etc.）
- Excel 导入/导出功能
- 编辑和删除操作
- 添加新员工按钮

#### 4. 员工表单页面 (`/employees/new` 和 `/employees/:id/edit`)
- 完整的员工信息表单
  - 基本信息：工号、姓名、性别、出生日期
  - 联系方式：电话、邮箱、身份证号
  - 入职信息：入职日期、转正日期、部门、职位
  - 紧急联系人信息
  - 地址和备注
- 表单验证（电话格式、邮箱格式、身份证格式）
- 支持新建和编辑两种模式
- 部门下拉选择（从 API 加载）

#### 5. 入职登记表单 (`/onboarding/:token`)
- 基于 token 的访问控制
- 显示预填充的员工基本信息
- 员工自助完善：
  - 个人信息（电话、邮箱、性别、出生日期）
  - 身份证号码
  - 家庭地址
  - 紧急联系人
  - 身份证照片上传（正反面）
- 提交成功后显示完成页面
- 独立页面设计（不使用主布局）

#### 6. 部门管理页面 (`/departments`)
- 部门列表表格
- 添加新部门（模态框）
- 编辑部门（模态框）
- 删除部门（确认对话框）

## 技术栈

- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Ant Design 5** - UI 组件库
- **React Router 7** - 路由管理
- **Axios** - HTTP 客户端
- **dayjs** - 日期处理

## 运行项目

### 开发模式

```bash
# 在项目根目录
npm run dev:frontend

# 或者直接在 frontend 目录
cd frontend
npm start
```

前端将运行在 http://localhost:3000

### 构建生产版本

```bash
cd frontend
npm run build
```

## 项目结构

```
frontend/src/
├── components/          # 可复用组件
│   ├── Layout/         # 布局组件
│   │   └── MainLayout.tsx
│   └── Common/         # 通用组件
│       └── ProtectedRoute.tsx
│
├── pages/              # 页面组件
│   ├── Login/          # 登录页
│   │   ├── Login.tsx
│   │   └── Login.css
│   ├── Dashboard/      # 仪表盘
│   │   └── Dashboard.tsx
│   ├── Employee/       # 员工管理
│   │   ├── EmployeeList.tsx
│   │   ├── EmployeeList.css
│   │   └── EmployeeForm.tsx
│   ├── Onboarding/     # 入职登记
│   │   ├── OnboardingForm.tsx
│   │   └── OnboardingForm.css
│   └── Department/     # 部门管理
│       └── DepartmentList.tsx
│
├── services/           # API 服务层
│   ├── api.ts         # Axios 实例配置
│   ├── authService.ts # 认证相关 API
│   ├── employeeService.ts  # 员工相关 API
│   └── departmentService.ts # 部门相关 API
│
├── contexts/           # React Context
│   └── AuthContext.tsx # 认证上下文
│
├── types/              # TypeScript 类型定义
│   └── index.ts
│
├── App.tsx            # 主应用组件和路由
└── index.tsx          # 应用入口
```

## API 集成说明

前端已配置好与后端的集成，需要后端 API 运行在 `http://localhost:3001`。

### 环境变量配置

创建 `frontend/.env` 文件：

```env
REACT_APP_API_URL=http://localhost:3001/api
```

### API 拦截器

- **请求拦截器**：自动在所有请求头添加 JWT token
- **响应拦截器**：
  - 401 错误：自动清除 token 并跳转到登录页
  - 403 错误：显示权限不足提示
  - 500+ 错误：显示服务器错误提示

## 待完成功能

以下功能已预留接口，等待后端 API 实现：

1. **真实的登录验证** - 目前使用模拟数据
2. **钉钉 OAuth 集成** - 按钮已存在，需要实现跳转逻辑
3. **Dashboard 统计数据** - 需要后端提供聚合数据 API
4. **Excel 导入/导出** - 文件上传和下载逻辑已实现
5. **身份证照片上传** - 文件上传组件已就绪
6. **用户个人资料页面** - 路由已配置，需要实现页面
7. **系统设置页面** - 路由已配置，需要实现页面

## 后续开发建议

1. **添加加载骨架屏**：提升用户体验
2. **错误边界组件**：更好的错误处理
3. **国际化支持**：使用 i18n 支持多语言
4. **主题切换**：支持亮色/暗色主题
5. **移动端优化**：进一步优化移动端体验
6. **单元测试**：使用 Jest 和 React Testing Library
7. **E2E 测试**：使用 Cypress 或 Playwright

## 注意事项

- 所有敏感数据（如密码、token）存储在 localStorage
- 使用 TypeScript 确保类型安全
- 遵循 Ant Design 设计规范
- 响应式设计支持移动端和桌面端
- 所有表单都包含验证规则
- 使用 dayjs 处理日期（比 moment.js 更轻量）

## 联系和反馈

如有问题或建议，请查看 CLAUDE.md 获取更多开发指南。
