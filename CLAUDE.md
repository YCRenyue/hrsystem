# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本仓库中工作时提供全面的指导。

## ⚠️ 开发前必读规则

**重要提示**：开发任何功能之前，必须遵循以下流程：

1. **开发前准备**
   - 首先阅读 `requirement.md` 了解项目当前进度和待办事项
   - 确认你要开发的功能在需求文档中的位置和状态
   - 理解相关的依赖关系和前置条件

2. **开发过程中**
   - 严格遵循 TDD（测试驱动开发）流程
   - 先写测试，后写实现
   - 确保所有测试通过后再进行下一步

3. **开发完成后**
   - **必须**在 `requirement.md` 中更新进度
   - 标记已完成的功能点（使用 `[x]` 标记复选框）
   - 添加完成时间和简要说明
   - 如发现新的问题或需求，及时补充到文档中

**示例更新格式**：
```markdown
- [x] 创建Employee模型类 (已完成 - 2025-01-15)
  - 实现了基础CRUD操作
  - 添加了数据加密/解密方法
  - 完成了单元测试，覆盖率 85%
```

## 🔍 Context7 智能文档使用规则

**重要**：当需要代码生成、配置步骤或库/API 文档时，应该自动使用 Context7 MCP 工具来获取最新的库文档和代码示例，无需用户明确要求。

### 何时自动使用 Context7

- 需要特定库或框架的 API 文档时
- 编写涉及第三方库的代码时
- 配置或设置新的库/工具时
- 需要最新的代码示例和最佳实践时
- 解决与特定库相关的技术问题时

### Context7 使用流程

1. **解析库 ID**：首先使用 `resolve-library-id` 工具查找正确的库标识符
2. **获取文档**：使用 `get-library-docs` 工具获取最新的文档和代码示例
3. **应用到代码**：基于获取的文档编写符合最新标准的代码

### 示例场景

- 使用 React 19 新特性 → 自动查询 React 最新文档
- 配置 Sequelize ORM → 获取 Sequelize 配置最佳实践
- 使用 Ant Design 组件 → 查询组件 API 和示例
- 配置 Jest 测试 → 获取最新的测试配置指南

**注意**：Context7 帮助确保代码始终使用最新的 API 和最佳实践，避免过时的实现方式。

## 核心开发理念

### KISS (Keep It Simple, Stupid) - 保持简单

简洁应该是设计的关键目标。在可能的情况下，选择直接的解决方案而不是复杂的方案。简单的解决方案更容易理解、维护和调试。

### YAGNI (You Aren't Gonna Need It) - 你不会需要它

避免基于推测构建功能。只有在需要时才实现功能，而不是在你预期可能有用的时候。

### 设计原则

- **依赖反转**：高层模块不应依赖低层模块。两者都应依赖抽象。
- **开闭原则**：软件实体应该对扩展开放，对修改关闭。
- **单一职责**：每个函数、类和模块应该有一个明确的目的。
- **快速失败**：尽早检查潜在错误，并在出现问题时立即抛出异常。

## ⚠️ 强制性开发工作流

**关键**：此工作流对所有功能开发都是必需的。不要跳过任何步骤。

### 测试驱动开发（TDD）流程

每个功能必须遵循此工作流：

1. **先写测试**
   - 在编写任何实现代码之前，先编写全面的测试
   - 测试应涵盖：正常路径、边缘情况、错误情况、验证
   - 包括单个函数/方法的单元测试
   - 包括 API 端点的集成测试

2. **运行测试（应该失败）**
   - 运行测试套件：`npm run test:all` 或 `npm test`
   - 验证测试失败并显示预期错误
   - 这确认测试确实在测试某些东西

3. **实现功能**
   - 编写最少的代码使测试通过
   - 遵循 KISS 和 YAGNI 原则
   - 遵守代码风格指南（ESLint）

4. **再次运行测试（应该通过）**
   - 运行：`npm run test:all`
   - 所有测试必须通过才能继续
   - 修复任何失败的测试后再继续

5. **检查代码质量**
   - 运行 linter：`npm run lint`
   - 修复所有 linting 错误：`npm run lint:fix`
   - 确保代码覆盖率达到最低阈值（50%+）

6. **只有在此之后：提交更改**
   - 暂存更改：`git add .`
   - 使用描述性消息提交
   - **永远不要**提交有失败测试的代码
   - **永远不要**提交有 linting 错误的代码

### TDD 工作流示例

```bash
# 1. 首先创建测试文件
touch backend/src/__tests__/newFeature.test.js

# 2. 编写测试（它们会失败）
# ... 编辑 newFeature.test.js ...

# 3. 运行测试（确认它们失败）
cd backend && npm run test:all

# 4. 实现功能
# ... 编辑实现文件 ...

# 5. 运行测试（确认它们通过）
npm run test:all

# 6. 检查代码质量
npm run lint

# 7. 只有在全部通过后：提交
git add .
git commit -m "feat(module): add new feature with tests"
```

### 自动化测试命令

```bash
# 运行所有测试并生成详细报告
cd backend && npm run test:all

# 运行特定测试文件
npx jest src/__tests__/employees.test.js

# 在监视模式下运行测试（用于开发）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 检查代码风格
npm run lint
npm run lint:fix  # 自动修复风格问题
```

### 测试覆盖率要求

- **最低覆盖率**：所有指标（行、函数、分支、语句）50%
- **目标覆盖率**：关键业务逻辑 80%+
- 覆盖率报告生成在 `backend/coverage/index.html`
- CI/CD 应强制执行覆盖率阈值

### 需要测试的内容

**必须测试：**
- 所有 API 端点（请求/响应、状态码、错误情况）
- 数据验证逻辑
- 身份验证和授权
- 数据库操作（CRUD）
- 数据加密/解密
- 业务逻辑函数
- 错误处理

**可选（但推荐）：**
- 边缘情况（空输入、非常大的输入、特殊字符）
- 性能（关键路径）
- 并发操作

### 何时可以跳过测试

**永远不要**。测试对以下内容是强制性的：
- 新功能
- Bug 修复（添加回归测试）
- 重构（确保没有回归）
- API 更改

唯一的例外是仅文档更改。

## 项目概述

这是一个与钉钉深度集成的企业 HR 管理系统，具有员工入职自动化、智能问答和全面报告功能。系统使用全栈 JavaScript 架构，前端使用 React，后端使用 Node.js/Express。

## 技术栈

**前端：**
- React 19 with TypeScript
- Ant Design 5.x UI 组件库
- React Router 导航
- Axios 用于 API 调用

**后端：**
- Node.js with Express 5.x
- Sequelize ORM with MySQL 8.0
- Redis 缓存
- JWT 身份验证

**基础设施：**
- Docker + Docker Compose 容器化
- MySQL 8.0 主数据库
- Redis 会话管理和缓存
- Nginx 反向代理

## 🧱 代码结构与模块化

### 文件和函数限制

- **永远不要创建超过 500 行代码的文件**。如果接近此限制，请通过拆分成模块进行重构。
- **函数应小于 50 行**，具有单一、明确的职责。
- **类应小于 100 行**，表示单个概念或实体。
- **将代码组织成清晰分离的模块**，按功能或职责分组。
- **行长度最大 100 字符**（由 ESLint/Prettier 强制执行）。

### 项目结构

```
hrsystem/
├── frontend/          # React TypeScript 应用
│   └── src/
│       ├── components/      # 可重用 UI 组件
│       ├── pages/          # 页面级组件
│       ├── services/       # API 客户端服务
│       ├── hooks/          # 自定义 React hooks
│       ├── utils/          # 工具函数
│       ├── types/          # TypeScript 类型定义
│       └── __tests__/      # 测试文件
│
├── backend/           # Node.js Express API
│   └── src/
│       ├── app.js           # 主应用入口
│       ├── config/          # 配置文件
│       ├── models/          # Sequelize 模型
│       ├── repositories/    # 数据访问层
│       ├── services/        # 业务逻辑层
│       ├── routes/          # API 路由定义
│       ├── controllers/     # 请求处理器
│       ├── middleware/      # 自定义中间件
│       ├── utils/           # 工具函数
│       ├── db/             # 数据库迁移和种子
│       └── __tests__/      # 测试文件
│
├── database/          # SQL 模式和初始化脚本
├── docker/            # Docker 配置
├── docs/             # 项目文档
└── scripts/          # 实用脚本
```

## 常用开发命令

### 安装和设置

```bash
# 安装所有依赖项（根目录、前端、后端）
npm run install:all

# 设置环境变量
npm run setup

# 初始化数据库
npm run db:migrate
npm run db:seed
```

### 开发

```bash
# 在开发模式下同时运行前端和后端
npm run dev

# 仅运行后端 (http://localhost:3001)
npm run dev:backend

# 仅运行前端 (http://localhost:3000)
npm run dev:frontend
```

### 测试

```bash
# 运行所有测试（前端 + 后端）
npm test

# 仅运行后端测试
npm run test:backend

# 仅运行前端测试
npm run test:frontend
```

### 数据库操作

```bash
# 运行数据库迁移
npm run db:migrate

# 播种示例数据
npm run db:seed
```

### Docker 操作

```bash
# 启动所有服务
npm run docker:up

# 停止所有服务
npm run docker:down

# 构建 Docker 镜像
npm run docker:build

# 查看日志
npm run docker:logs
```

### 代码质量

```bash
# 在前端和后端运行 linting
npm run lint

# 运行后端 linting
npm run lint:backend

# 运行前端 linting
npm run lint:frontend

# 构建生产前端
npm run build
```

## 📋 风格与约定

### JavaScript/TypeScript 风格指南

- **遵循 Airbnb JavaScript 风格指南**，具体选择如下：
  - 行长度：100 字符（由 ESLint 强制执行）
  - JavaScript 中字符串使用单引号
  - TypeScript 中字符串使用双引号
  - 在多行结构中使用尾随逗号
  - 2 个空格缩进
- **始终对新的前端代码使用 TypeScript**
- **对后端 JavaScript 函数使用 JSDoc 注释**
- **对前端 TypeScript 函数使用 TSDoc 注释**

### 命名约定

- **变量和函数**：`camelCase`
- **类和 React 组件**：`PascalCase`
- **常量**：`UPPER_SNAKE_CASE`
- **私有方法**：`_leadingUnderscore`（仅约定）
- **文件名**：
  - React 组件：`PascalCase.tsx`
  - 工具/服务：`camelCase.js` 或 `camelCase.ts`
  - 测试：`filename.test.js` 或 `filename.test.ts`

### JSDoc/TSDoc 标准

对 JavaScript 后端代码使用 JSDoc：

```javascript
/**
 * 计算产品的折扣价格
 *
 * @param {number} price - 产品原价
 * @param {number} discountPercent - 折扣百分比（0-100）
 * @param {number} [minAmount=0.01] - 允许的最低最终价格
 * @returns {number} 应用折扣后的最终价格
 * @throws {Error} 如果 discount_percent 不在 0 到 100 之间
 *
 * @example
 * calculateDiscount(100, 20) // 返回 80
 */
function calculateDiscount(price, discountPercent, minAmount = 0.01) {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error('Discount percent must be between 0 and 100');
  }
  const finalPrice = price * (1 - discountPercent / 100);
  if (finalPrice < minAmount) {
    throw new Error(`Final price cannot be below ${minAmount}`);
  }
  return finalPrice;
}
```

对类型安全使用 TypeScript：

```typescript
/**
 * 计算产品的折扣价格
 */
function calculateDiscount(
  price: number,
  discountPercent: number,
  minAmount: number = 0.01
): number {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error('Discount percent must be between 0 and 100');
  }
  const finalPrice = price * (1 - discountPercent / 100);
  if (finalPrice < minAmount) {
    throw new Error(`Final price cannot be below ${minAmount}`);
  }
  return finalPrice;
}
```

## 架构模式

### 数据加密策略

系统对敏感员工数据（身份证号、电话号码、银行账户）实施 **AES-256 加密**。加密层位于 `backend/src/utils/encryption.js`：

- **加密存储**：敏感字段在数据库中以 `_encrypted` 后缀加密存储
- **基于哈希的搜索**：可搜索的加密字段还存储带有 `_hash` 后缀的哈希用于查找
- **数据脱敏**：向没有适当权限的用户显示时，个人数据会被脱敏（例如，电话号码显示为 `138****8888`）
- **基于权限的解密**：数据仅对具有适当角色权限的用户完全解密

### 三级权限系统

1. **超级管理员**：完全系统访问、用户管理、权限配置
2. **HR 管理员**：员工信息管理、报表查看和导出、入职流程管理
3. **员工**：仅查看和编辑个人信息、自助服务功能

权限在以下级别强制执行：
- `backend/src/middleware/` 中的中间件级别
- 仓库中的数据访问级别
- 前端路由中的 UI 级别

### 数据库设计

系统使用 **Sequelize ORM**，具有以下关键模型：

- `Employee`：核心员工信息，带有加密字段
- `User`：身份验证和授权
- `Department`：组织结构
- `OnboardingProcess`：跟踪员工入职工作流
- `OperationLog`：敏感操作的审计跟踪

**重要**：数据库模式不使用软删除（没有 `deleted_at` 列）。这在 `backend/src/config/database.js` 中配置，设置为 `paranoid: false`。

### 仓库模式

通过仓库（`backend/src/repositories/`）抽象数据访问：
- 为数据操作提供一致的接口
- 自动处理加密/解密
- 实现基于权限的数据过滤
- 集中查询优化

### 入职自动化流程

1. **HR 预注册**：HR 使用最少信息（姓名、工号、入职日期、部门）创建基本员工记录
2. **定时任务**：在入职日期，系统自动：
   - 生成唯一表单令牌
   - 创建入职流程记录
   - 通过钉钉（主要）或短信（备用）发送通知
3. **员工自助服务**：员工通过令牌链接访问表单以完成个人信息
4. **数据合并**：提交的数据与 HR 预注册数据合并，状态更新为"已完成"
5. **HR 备用**：如果员工在时间范围内未完成，HR 可以手动完成信息

## 🧪 测试策略

### 测试驱动开发（TDD）

1. **首先编写测试** - 在实现之前定义预期行为
2. **观察它失败** - 确保测试确实在测试某些东西
3. **编写最少代码** - 刚好足以使测试通过
4. **重构** - 在保持测试绿色的同时改进代码
5. **重复** - 一次一个测试

### 测试最佳实践

**后端（Jest）：**

```javascript
// 使用 describe 块对相关测试进行分组
describe('EmployeeService', () => {
  let employeeService;
  let mockDb;

  beforeEach(() => {
    mockDb = createMockDatabase();
    employeeService = new EmployeeService(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // 使用描述性测试名称
  test('should create employee with encrypted sensitive data', async () => {
    const employeeData = {
      name: 'Test User',
      phone: '13888888888',
      idCard: '110101199001011234'
    };

    const result = await employeeService.createEmployee(employeeData);

    expect(result.nameEncrypted).toBeDefined();
    expect(result.phoneEncrypted).toBeDefined();
    expect(result.name).toBeUndefined(); // 不应存储明文
  });

  // 测试边缘情况和错误条件
  test('should throw error when employee number already exists', async () => {
    const employeeData = { employeeNumber: 'EMP001', name: 'Test' };

    await expect(employeeService.createEmployee(employeeData))
      .rejects
      .toThrow('Employee number already exists');
  });
});
```

**前端（React Testing Library）：**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmployeeForm } from './EmployeeForm';

describe('EmployeeForm', () => {
  test('should submit form with valid data', async () => {
    const mockOnSubmit = jest.fn();

    render(<EmployeeForm onSubmit={mockOnSubmit} />);

    // 填写表单
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'John Doe' }
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'john@example.com' }
    });

    // 提交
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    // 断言
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com'
      });
    });
  });

  test('should display validation error for invalid email', async () => {
    render(<EmployeeForm onSubmit={jest.fn()} />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'invalid-email' }
    });
    fireEvent.blur(screen.getByLabelText('Email'));

    expect(await screen.findByText('Invalid email format')).toBeInTheDocument();
  });
});
```

### 测试组织

- **单元测试**：孤立测试单个函数/方法
- **集成测试**：测试组件交互（API 路由、数据库操作）
- **E2E 测试**：测试完整的用户工作流（入职、员工管理）
- **将测试文件放在它们测试的代码旁边**（在 `__tests__` 子目录中）
- 目标为 **80%+ 代码覆盖率**，但专注于关键路径

## 🚨 错误处理

### 异常最佳实践

**后端错误处理：**

```javascript
// 创建自定义错误类
class ApplicationError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends ApplicationError {
  constructor(message, details = {}) {
    super(message, 400);
    this.details = details;
  }
}

class NotFoundError extends ApplicationError {
  constructor(resource, id) {
    super(`${resource} with id ${id} not found`, 404);
    this.resource = resource;
    this.id = id;
  }
}

class EncryptionError extends ApplicationError {
  constructor(message) {
    super(message, 500);
  }
}

// 在路由/控制器中使用特定错误处理
app.use((err, req, res, next) => {
  // 记录错误
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // 处理特定错误类型
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({
      error: 'Validation Error',
      message: err.message,
      details: err.details
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(err.statusCode).json({
      error: 'Not Found',
      message: err.message
    });
  }

  // 默认错误响应
  res.status(err.statusCode || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});
```

**异步错误处理包装器：**

```javascript
/**
 * 异步路由处理器的包装器以捕获错误
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 使用
router.post('/employees', asyncHandler(async (req, res) => {
  const employee = await employeeService.createEmployee(req.body);
  res.status(201).json({ success: true, data: employee });
}));
```

### 日志策略

```javascript
const winston = require('winston');

// 配置结构化日志
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'hr-system' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// 在开发中添加控制台传输
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// 使用
logger.info('Employee created', { employeeId: employee.id, createdBy: req.user.id });
logger.error('Failed to encrypt data', { error: err.message, field: 'idCard' });
```

## 环境配置

将 `.env.example` 复制到 `.env` 并配置：

**关键设置：**
- `DB_*`：数据库连接参数
- `JWT_SECRET`：生产环境至少 32 个字符
- `ENCRYPTION_KEY`：用于敏感数据的 AES-256 加密
- `DINGTALK_*`：钉钉 API 凭据用于集成
- `PORT`：后端服务器端口（默认 3001）
- `FRONTEND_URL`：用于 CORS 配置的前端 URL

## 钉钉集成

系统与钉钉集成以实现：
- OAuth 身份验证和用户登录
- 通过电话号码自动绑定员工账户
- 入职流程的工作通知
- 组织结构同步

**关键 API 端点**（实施时）：
- `POST /api/auth/dingtalk/callback`：OAuth 回调处理器
- `POST /api/dingtalk/notify`：发送工作通知
- `GET /api/dingtalk/departments`：同步部门结构

## 🗄️ 数据库命名标准

### 实体特定主键

所有数据库表使用实体特定主键以保持清晰和一致：

```sql
-- ✅ 标准化：实体特定主键
employees.employee_id VARCHAR(36) PRIMARY KEY
users.user_id VARCHAR(36) PRIMARY KEY
departments.department_id VARCHAR(36) PRIMARY KEY
onboarding_processes.process_id VARCHAR(36) PRIMARY KEY
operation_logs.log_id VARCHAR(36) PRIMARY KEY
```

### 字段命名约定

```sql
-- 主键：{entity}_id
employee_id, user_id, department_id

-- 外键：{referenced_entity}_id
employee_id REFERENCES employees(employee_id)
department_id REFERENCES departments(department_id)

-- 时间戳：{action}_at
created_at, updated_at, hired_at, completed_at

-- 布尔值：is_{state}
is_active, is_complete, data_complete

-- 加密字段：{field}_encrypted
name_encrypted, phone_encrypted, id_card_encrypted

-- 用于搜索的哈希字段：{field}_hash
name_hash, phone_hash

-- 计数：{entity}_count
employee_count, reminder_count
```

### 仓库模式

仓库模式提供一致的数据访问：

```javascript
class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async findById(id) {
    return await this.model.findByPk(id);
  }

  async findAll(options = {}) {
    return await this.model.findAll(options);
  }

  async create(data) {
    return await this.model.create(data);
  }

  async update(id, data) {
    const record = await this.findById(id);
    if (!record) throw new NotFoundError(this.model.name, id);
    return await record.update(data);
  }

  async delete(id) {
    const record = await this.findById(id);
    if (!record) throw new NotFoundError(this.model.name, id);
    return await record.destroy();
  }
}

// 使用
class EmployeeRepository extends BaseRepository {
  constructor() {
    super(Employee);
  }

  async findByEmployeeNumber(employeeNumber) {
    return await this.model.findOne({ where: { employee_number: employeeNumber } });
  }

  async findByDepartment(departmentId) {
    return await this.model.findAll({ where: { department_id: departmentId } });
  }
}
```

### 模型-数据库对齐

Sequelize 模型精确镜像数据库字段：

```javascript
const Employee = sequelize.define('Employee', {
  employee_id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  employee_number: {
    type: DataTypes.STRING(20),
    unique: true,
    allowNull: false
  },
  name_encrypted: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Encrypted employee name'
  },
  name_hash: {
    type: DataTypes.STRING(64),
    comment: 'Hash for searching encrypted names'
  },
  department_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    references: {
      model: 'departments',
      key: 'department_id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'employees',
  underscored: true,  // 列名使用 snake_case
  timestamps: true
});
```

## 数据库模式说明

- **字符集**：所有表使用 `utf8mb4` 和 `utf8mb4_unicode_ci` 排序规则以支持完整的 Unicode（包括表情符号）
- **时间戳**：Sequelize 自动管理 `created_at` 和 `updated_at` 字段
- **外键**：在 Sequelize 模型中定义，具有适当的级联规则
- **索引**：对加密字段哈希和外键至关重要
- **无软删除**：数据库配置中设置 `paranoid: false` - 记录被永久删除

## 开发指南

### 添加新功能时

1. **加密字段**：如果添加敏感数据字段，使用 `backend/src/utils/encryption.js` 中的加密工具
2. **API 路由**：遵循 RESTful 约定，在 `backend/src/routes/` 中实现，带有相应的控制器
3. **权限**：始终在受保护路由的中间件中添加权限检查
4. **审计日志**：将敏感操作（创建/更新/删除员工数据）记录到 `operation_logs` 表
5. **前端 API 调用**：使用集中式 axios 实例（位于 `frontend/src/api/`）

### 测试方法

- **单元测试**：测试单个服务和工具
- **集成测试**：使用数据库测试 API 端点
- **E2E 测试**：测试关键用户流程（入职、员工管理）

### 数据库迁移

修改数据库模式时：
1. 在 `backend/src/db/migrations/` 中创建新的迁移文件
2. 使用 Sequelize 迁移语法
3. 始终提供 `up` 和 `down` 方法
4. 在提交之前在干净的数据库上测试迁移

## 文件上传处理

系统支持文档上传（身份证、合同等）：
- 最大文件大小：10MB（可通过 `MAX_FILE_SIZE` 配置）
- 允许的类型：jpg、jpeg、png、pdf、doc、docx、xls、xlsx
- 存储：`uploads/` 目录下的本地文件系统
- 未来：将迁移到兼容 S3 的对象存储

## 🚀 性能考虑

### 优化指南

- **在优化之前先分析** - 使用 Node.js 分析器或 Chrome DevTools
- **策略性地使用缓存** - Redis 用于会话数据，内存中用于计算值
- **优化数据库查询** - 使用适当的索引并避免 N+1 查询
- **实现分页** - 永远不要返回无界结果集
- **对 I/O 绑定操作使用 async/await**
- **考虑工作线程** 用于 CPU 密集型任务（例如，大型 Excel 处理）

### 当前性能设置

- **数据库连接池**：在 `backend/src/config/database.js` 中配置
  - 最大连接数：10
  - 最小连接数：0
  - 获取超时：30 秒
  - 空闲超时：10 秒
- **速率限制**：API 每个 IP 每 15 分钟限制为 100 个请求
- **Redis 缓存**：用于会话存储和频繁访问的数据
- **分页**：始终为列表端点实现分页（默认：每页 10 项，最多：100）
- **文件上传**：最大文件大小 10MB（可通过 `MAX_FILE_SIZE` 配置）

### 性能优化示例

```javascript
// 缓存昂贵的查询
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 分钟 TTL

async function getDepartmentHierarchy() {
  const cacheKey = 'department_hierarchy';
  const cached = cache.get(cacheKey);

  if (cached) {
    logger.debug('Returning cached department hierarchy');
    return cached;
  }

  logger.debug('Fetching department hierarchy from database');
  const departments = await Department.findAll({
    include: [{ model: Department, as: 'children' }],
    order: [['name', 'ASC']]
  });

  cache.set(cacheKey, departments);
  return departments;
}

// 使用预加载优化 N+1 查询
async function getEmployeesWithDepartments() {
  // ✅ 好：使用 JOIN 的单个查询
  return await Employee.findAll({
    include: [
      { model: Department, attributes: ['department_id', 'name'] },
      { model: Position, attributes: ['position_id', 'title'] }
    ],
    limit: 100
  });

  // ❌ 坏：N+1 查询
  // const employees = await Employee.findAll();
  // for (const emp of employees) {
  //   emp.department = await Department.findByPk(emp.department_id);
  // }
}

// 对大型数据集使用流
const { Transform } = require('stream');
const XLSX = require('xlsx');

async function processLargeExcelFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = XLSX.stream.to_json(filePath);

    const processStream = new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        // 处理每一行
        processEmployeeRow(chunk)
          .then(result => {
            this.push(result);
            callback();
          })
          .catch(callback);
      }
    });

    stream
      .pipe(processStream)
      .on('data', data => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}
```

## 📝 文档标准

### 代码文档

- 每个**模块**应有 JSDoc 注释解释其目的
- 所有**公共函数**必须有完整的 JSDoc/TSDoc 注释
- **复杂逻辑**应有内联注释，并有清晰的推理
- 保持 **README.md** 更新，包含设置说明和示例
- 使用 JSDoc 或 OpenAPI/Swagger 维护 **API 文档**

### 何时更新文档

在以下情况下更新文档：
- 添加新功能或端点
- 更改环境变量或配置
- 修改数据库模式
- 更新部署程序
- 添加新的依赖项或工具
- 发现并修复错误（添加到 CHANGELOG）

### 要维护的文档文件

- `CLAUDE.md` - 本文件，Claude Code 的模式和指导
- `README.md` - 项目概述和快速开始
- `requirement.md` - 详细的功能需求
- `docs/architecture.md` - 系统架构和设计
- `docs/api.md` - API 端点文档
- `docs/database.md` - 数据库模式和设计
- `docs/backend.md` - 后端开发指南
- `docs/frontend.md` - 前端开发指南

## 部署

### Docker 部署（推荐）

1. 确保 `.env` 文件已配置
2. 从项目根目录运行 `npm run docker:up`
3. 服务将可用：
   - 前端：http://localhost:3000
   - 后端 API：http://localhost:3001
   - MySQL：localhost:3306
   - Redis：localhost:6379

### 手动部署

1. 安装依赖项：`npm run install:all`
2. 配置数据库和 Redis
3. 运行迁移：`npm run db:migrate`
4. 构建前端：`cd frontend && npm run build`
5. 启动后端：`cd backend && npm start`
6. 使用 Nginx 或类似工具提供前端构建

## 故障排除

**数据库连接问题：**
- 验证 MySQL 正在运行且 `.env` 中的凭据正确
- 检查 `DB_HOST` 是否正确（本地为 'localhost'，Docker 为 'mysql'）
- 确保 MySQL 用户具有适当的权限

**前端/后端连接问题：**
- 验证后端 `.env` 中的 `FRONTEND_URL` 与前端来源匹配
- 检查 `backend/src/app.js` 中的 CORS 配置
- 确保后端在预期端口上运行

**钉钉集成问题：**
- 验证钉钉应用凭据正确
- 检查钉钉应用具有所需权限
- 确保回调 URL 在钉钉管理面板中列入白名单

## 文档参考

有关详细信息，请参阅：
- `requirement.md`：全面的功能需求和实施计划
- `docs/architecture.md`：系统架构和设计模式
- `docs/backend.md`：带有代码示例的后端开发指南
- `docs/database.md`：数据库模式和设计详细信息
- `docs/api.md`：API 端点文档
- `docs/frontend.md`：前端架构和组件指南
- `README.md`：项目概述和快速开始指南

## 🔄 Git 工作流

### 分支策略

- `main` - 生产就绪代码（受保护）
- `develop` - 功能集成分支（如需要）
- `feature/*` - 新功能（例如，`feature/onboarding-automation`）
- `fix/*` - Bug 修复（例如，`fix/encryption-error`）
- `docs/*` - 文档更新（例如，`docs/api-endpoints`）
- `refactor/*` - 代码重构（例如，`refactor/employee-service`）
- `test/*` - 测试添加或修复（例如，`test/employee-encryption`）

### 提交消息格式

**永远不要在提交消息中包含"claude code"或"由 claude code 编写"**

格式：
```
<type>(<scope>): <subject>

<body>

<footer>
```

类型：`feat`、`fix`、`docs`、`style`、`refactor`、`test`、`chore`

示例：

```
feat(auth): add DingTalk OAuth authentication

- Implement OAuth callback handler
- Add user profile synchronization
- Store access tokens securely

Closes #123
```

```
fix(encryption): resolve decryption error for phone numbers

The phone number decryption was failing due to incorrect
encoding. Updated to use base64 encoding consistently.

Fixes #456
```

```
refactor(employee): extract encryption logic to utility

Moved encryption/decryption logic from EmployeeService to
a dedicated EncryptionUtil class for better reusability.
```

### GitHub 流程摘要

```
main (protected) ←── PR ←── feature/your-feature
  ↓                           ↑
deploy                   development
```

### 日常工作流

1. `git checkout main && git pull origin main`
2. `git checkout -b feature/new-feature`
3. 进行更改 + 编写测试
4. `git add . && git commit -m "feat(scope): description"`
5. `git push origin feature/new-feature`
6. 创建 Pull Request → 审查 → 合并到 main

## 🛡️ 安全最佳实践

### 安全指南

- **永远不要提交秘密** - 对所有敏感配置使用环境变量
- **验证所有用户输入** - 使用 express-validator 或类似工具
- **使用参数化查询** - Sequelize 自动处理此问题
- **实施速率限制** - 已在 `backend/src/app.js` 中配置
- **保持依赖项更新** - 定期运行 `npm audit` 和 `npm update`
- **在生产中对所有外部通信使用 HTTPS**
- **实施适当的身份验证** - JWT 令牌具有合理的过期时间
- **哈希密码** - 使用具有适当盐轮次的 bcrypt

### 本项目的关键安全规则

- 所有敏感员工数据（身份证号、电话号码、银行账户）**必须在存储前加密**
- **永远不要记录解密的敏感数据** - 仅记录加密值或哈希
- 在返回解密数据之前实施**适当的权限检查**
- 使用**参数化查询**（Sequelize 处理此问题）以防止 SQL 注入
- **JWT 令牌在 24 小时后过期**（可通过 `JWT_EXPIRES_IN` 配置）
- **在所有 API 路由上强制执行速率限制**（每 15 分钟 100 个请求）
- **在生产中使用 HTTPS**（在 Nginx 中配置）
- **审计所有敏感操作** - 记录到 `operation_logs` 表

### 安全实施示例

```javascript
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * 使用 bcrypt 哈希密码
 */
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * 验证密码与哈希
 */
async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * 生成加密安全令牌
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}
```

## ⚠️ 重要提示

- **永远不要假设或猜测** - 有疑问时，请寻求澄清
- **始终验证文件路径和模块名称**后再使用
- **在添加新模式或依赖项时保持 CLAUDE.md 更新**
- **测试你的代码** - 没有测试的功能是不完整的
- **记录你的决策** - 未来的开发人员（包括你自己）会感谢你
- **遵循单一职责原则** - 每个函数/类应该做好一件事
- **编写自文档化代码** - 使用清晰的名称和最少的注释
- **快速失败** - 尽早检查错误并抛出有意义的异常
- **保持函数在 50 行以下** - 将复杂逻辑分解为更小、可测试的单元
- **保持文件在 500 行以下** - 将大文件拆分为专注的模块
- **遵循 KISS 和 YAGNI** - 简单的解决方案更好，只构建现在需要的东西

## 📚 有用资源

### 基本工具和库

- **Node.js 文档**：https://nodejs.org/docs/
- **Express.js 指南**：https://expressjs.com/
- **Sequelize ORM**：https://sequelize.org/docs/
- **React 文档**：https://react.dev/
- **Ant Design 组件**：https://ant.design/components/
- **Jest 测试**：https://jestjs.io/docs/
- **React Testing Library**：https://testing-library.com/react

### 最佳实践

- **Node.js 最佳实践**：https://github.com/goldbergyoni/nodebestpractices
- **JavaScript 风格指南**（Airbnb）：https://github.com/airbnb/javascript
- **TypeScript 手册**：https://www.typescriptlang.org/docs/handbook/
- **React 模式**：https://reactpatterns.com/

---

_本文档是一个活的指南。随着项目的发展和新模式的出现而更新它。_
