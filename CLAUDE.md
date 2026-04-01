# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本仓库中工作时提供全面的指导。

## ⚠️ 开发前必读规则

**重要提示**：开发任何功能之前，必须遵循以下流程：

1. **开发前准备**

   - 首先阅读 `requirement.md` 了解项目当前进度和待办事项
   - 确认你要开发的功能在需求文档中的位置和状态
   - 理解相关的依赖关系和前置条件
2. **开发过程中**

   - **保持代码库整洁**：不要创建不必要的文件
3. **开发完成后**

   - **必须**在 `requirement.md` 中更新进度
   - 标记已完成的功能点（使用 `[x]` 标记复选框）
   - 添加完成时间和简要说明
   - 如发现新的问题或需求，及时补充到文档中
   - **必须**运行编译和 lint 检查，确认无报错后再提交：
     - 前端：`cd frontend && npx tsc --noEmit && npx eslint src/ --max-warnings=0`
     - 后端：`npm run lint:backend`（确认无 error，warning 可以是已有遗留）
   - 以上检查全部通过后，执行 `git commit` 提交代码

## 📁 文件创建和命名规则

**重要**：保持代码库的整洁和专业，遵循以下文件创建原则：

### 文件命名规范

**所有文件名必须使用英文，不允许使用中文文件名**

- ✅ 正确：`DEPLOYMENT.md`, `config.json`, `user-service.js`
- ❌ 错误：`部署说明.md`, `配置.json`, `用户服务.js`

**文档内容可以使用中文**

- 文件名使用英文（如 `README.md`, `DEPLOYMENT.md`）
- 文件内容可以是中文（如中文的部署说明、使用指南等）

### 禁止创建的文件类型

1. **测试用的临时文件**

   - 不要创建 `test.js`, `test.ts`, `temp.js` 等临时测试文件
   - 不要创建 `demo.html`, `example.js` 等演示文件
   - 测试代码必须放在规范的测试目录中（`__tests__/` 或 `*.test.js`）
2. **说明性文档（除非明确要求）**

   - 不要主动创建 `SETUP.md`, `GUIDE.md`, `HOWTO.md` 等说明文档
   - 不要创建 `TODO.md`, `NOTES.md` 等笔记文件
   - 配置说明应该写在已有的 `README.md` 或 `CLAUDE.md` 中
   - **唯一例外**：用户明确要求创建文档时才创建
3. **示例代码文件**

   - 不要创建 `example-*.js`, `sample-*.ts` 等示例文件
   - 代码示例应该放在注释或文档中，不要创建单独文件
4. **备份和临时文件**

   - 不要创建 `*.backup`, `*.old`, `*.tmp` 等备份文件
   - 不要创建 `draft-*.js` 等草稿文件

### 允许创建的文件

1. **功能代码文件**

   - 新功能的实现文件（controllers, services, models等）
   - 必须符合项目目录结构规范
2. **规范的测试文件**

   - 放在 `__tests__/` 目录下的测试文件
   - 或使用 `*.test.js`, `*.spec.js` 命名的测试文件
3. **必要的配置文件**

   - 仅在需要时创建新的配置文件
   - 优先修改已有配置而不是创建新配置
4. **数据库迁移文件**

   - 按照项目规范创建的迁移文件
   - 必须放在 `db/migrations/` 目录

### 文件创建前的检查清单

在创建任何新文件之前，问自己：

1. **是否必需？** - 这个文件是实现功能所必需的吗？
2. **是否已存在？** - 是否可以修改现有文件而不是创建新文件？
3. **是否规范？** - 文件位置和命名是否符合项目规范？
4. **是否持久？** - 这个文件是长期需要的还是临时的？（禁止临时文件）

### 正确的做法

**错误示例**：

```bash
# 不要这样做
创建 backend/test-api.js              # 临时测试文件
创建 DINGTALK_SETUP.md               # 未经请求的文档
创建 frontend/example-component.tsx  # 示例文件
创建 backend/temp-fix.js             # 临时修复文件
```

**正确示例**：

```bash
# 应该这样做
修改 README.md                       # 在现有文档中添加配置说明
创建 backend/src/controllers/authController.js  # 功能代码
创建 backend/src/__tests__/auth.test.js        # 规范的测试文件
更新 CLAUDE.md                       # 在已有文档中补充说明
```

### 违规处理

如果发现创建了不必要的文件：

1. 立即删除多余文件
2. 将有用内容合并到现有文件中
3. 在后续开发中避免重复错误

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

## 表情符号使用规则

**重要**：为保证代码和文档的可读性和兼容性，请遵循以下规则：

### 禁止使用表情符号的文件

**所有代码文件和文档中禁止使用表情符号**，包括但不限于：

- 所有源代码文件（.js, .ts, .jsx, .tsx, .py, .java 等）
- 配置文件（.json, .yaml, .yml, .env 等）
- 文档文件（.md, .txt 等），**除了 requirement.md**
- 数据库迁移文件
- 测试文件
- README 文件

### 唯一例外：requirement.md

- **仅 requirement.md 文件允许使用表情符号用于任务列表标记**
- 推荐的表情符号使用：

  - [X] 或 DONE - 已完成的任务
  - [ ] 或 TODO - 待开始的任务

  - WIP - 进行中的任务

### 替代方案

在其他文件中，使用文本标记替代表情符号：

- 使用 [DONE], [TODO], [WIP], [BLOCKED] 等文本标记
- 使用 ASCII 字符：*, -, +, >, ! 等
- 使用代码注释：// FIXME:, // TODO:, // NOTE: 等

### 原因说明

1. **编码兼容性**：表情符号可能导致文件编码问题（UTF-8 vs ASCII）
2. **版本控制**：表情符号在 diff 中不易识别，影响代码审查
3. **可读性**：在某些编辑器或终端中显示不正确
4. **国际化**：表情符号在不同系统和地区可能显示不同
5. **专业性**：代码文件应保持专业和简洁

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
