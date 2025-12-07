# 贡献指南

感谢您对HR管理系统的贡献！本文档将指导您如何为项目做出贡献。

## 开发前准备

### 环境要求

- Node.js 18.x 或更高版本
- MySQL 8.0
- Redis 7.x
- Docker 和 Docker Compose（可选）
- Git

### 本地开发设置

1. **Fork 并克隆仓库**

```bash
git clone https://github.com/your-username/hrsystem.git
cd hrsystem
```

2. **安装依赖**

```bash
# 安装所有依赖
npm run install:all

# 或分别安装
cd backend && npm install
cd ../frontend && npm install
```

3. **配置环境变量**

```bash
# 复制环境变量模板
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 编辑 .env 文件，填入必要的配置
```

4. **启动数据库服务**

```bash
# 使用 Docker Compose
docker-compose up -d mysql redis

# 或手动启动 MySQL 和 Redis
```

5. **运行数据库迁移**

```bash
cd backend
npm run db:migrate
npm run db:seed  # 可选：加载示例数据
```

6. **启动开发服务器**

```bash
# 在项目根目录
npm run dev

# 或分别启动
cd backend && npm run dev
cd frontend && npm start
```

## 开发工作流

### 分支策略

- `main`：生产环境代码，受保护
- `develop`：开发分支（如需要）
- `feature/*`：新功能开发
- `fix/*`：Bug 修复
- `docs/*`：文档更新
- `refactor/*`：代码重构
- `test/*`：测试相关

### 创建功能分支

```bash
# 从 main 分支创建新分支
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# 或修复 Bug
git checkout -b fix/bug-description
```

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型 (type)**：
- `feat`：新功能
- `fix`：Bug 修复
- `docs`：文档更新
- `style`：代码格式（不影响代码运行）
- `refactor`：重构
- `test`：测试相关
- `chore`：构建过程或辅助工具的变动

**示例**：

```bash
# 新功能
git commit -m "feat(employees): add employee detail page"

# Bug 修复
git commit -m "fix(auth): resolve login token expiration issue"

# 文档更新
git commit -m "docs(readme): update installation instructions"

# 重构
git commit -m "refactor(api): extract encryption logic to utility"
```

### 提交前检查

在提交代码前，请确保：

1. **代码通过 Linting**

```bash
# 后端
cd backend && npm run lint

# 前端
cd frontend && npm run lint  # 如果有配置
```

2. **所有测试通过**

```bash
# 后端
cd backend && npm run test:all

# 前端
cd frontend && npm test -- --watchAll=false
```

3. **代码覆盖率达标**

```bash
cd backend && npm run test:coverage
```

最低覆盖率要求：
- 行覆盖率：50%
- 函数覆盖率：50%
- 分支覆盖率：50%
- 语句覆盖率：50%

### 测试驱动开发（TDD）

**强制要求**：所有新功能必须遵循 TDD 流程

1. **先写测试**

```javascript
// backend/src/__tests__/newFeature.test.js
describe('NewFeature', () => {
  test('should do something', () => {
    // 编写测试用例
    expect(newFeature()).toBe(expectedResult);
  });
});
```

2. **运行测试（应该失败）**

```bash
npm run test:all
```

3. **实现功能**

```javascript
// backend/src/newFeature.js
function newFeature() {
  // 实现逻辑
}
```

4. **再次运行测试（应该通过）**

```bash
npm run test:all
```

5. **重构代码**

优化代码结构，确保测试仍然通过。

### Pull Request 流程

1. **推送分支到 GitHub**

```bash
git push origin feature/your-feature-name
```

2. **创建 Pull Request**

- 前往 GitHub 仓库
- 点击 "New Pull Request"
- 选择您的分支
- 填写 PR 描述

**PR 描述模板**：

```markdown
## 变更说明

简要描述本次变更的内容和原因。

## 变更类型

- [ ] 新功能 (feat)
- [ ] Bug 修复 (fix)
- [ ] 文档更新 (docs)
- [ ] 重构 (refactor)
- [ ] 测试 (test)
- [ ] 其他 (chore)

## 相关 Issue

Fixes #123
Closes #456

## 测试

- [ ] 已添加单元测试
- [ ] 已添加集成测试
- [ ] 所有测试通过
- [ ] 代码覆盖率达标

## 检查清单

- [ ] 代码通过 Linting
- [ ] 提交信息遵循规范
- [ ] 文档已更新（如需要）
- [ ] 无敏感信息泄露
- [ ] 无硬编码配置

## 截图（如适用）

添加相关截图展示变更效果。
```

3. **等待 CI 检查**

PR 创建后，GitHub Actions 会自动运行：
- 后端测试
- 前端测试
- 代码质量检查
- Docker 构建验证
- 安全扫描

确保所有检查通过。

4. **代码审查**

至少需要一位团队成员审查并批准。

5. **合并到主分支**

审查通过后，使用 "Squash and merge" 合并。

## 代码规范

### JavaScript/TypeScript

- 遵循 [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- 行长度：最大 100 字符
- 使用 2 空格缩进
- 字符串：JavaScript 使用单引号，TypeScript 使用双引号
- 函数最大长度：50 行
- 文件最大长度：500 行

### 命名约定

- **变量和函数**：`camelCase`
- **类和组件**：`PascalCase`
- **常量**：`UPPER_SNAKE_CASE`
- **私有方法**：`_leadingUnderscore`

### 文件组织

```
module/
├── index.ts          # 公共 API
├── types.ts          # 类型定义
├── utils.ts          # 工具函数
├── service.ts        # 业务逻辑
└── __tests__/        # 测试文件
    ├── service.test.ts
    └── utils.test.ts
```

### 注释规范

使用 JSDoc/TSDoc：

```javascript
/**
 * Calculate employee salary with bonus
 *
 * @param {number} baseSalary - Base monthly salary
 * @param {number} bonusRate - Bonus rate (0-1)
 * @returns {number} Total salary including bonus
 * @throws {Error} If baseSalary or bonusRate is invalid
 *
 * @example
 * calculateSalary(10000, 0.1) // returns 11000
 */
function calculateSalary(baseSalary, bonusRate) {
  // Implementation
}
```

## 特殊规则

### 表情符号使用

**禁止**在代码文件中使用表情符号，包括：
- 所有源代码文件
- 配置文件
- 文档文件（`requirement.md` 除外）

**允许**：
- `requirement.md` 文件中用于任务标记

### 文件大小限制

- 单个文件不超过 500 行
- 函数不超过 50 行
- 类不超过 100 行

如果超过限制，请重构为多个模块。

### 安全规则

- 永远不要提交密钥、密码或敏感信息
- 使用环境变量存储配置
- 不要硬编码 API 密钥或数据库凭据
- 所有敏感数据必须加密存储

## CI/CD 流程

### 自动化检查

每次提交和 PR 都会触发以下检查：

1. **后端测试**
   - Linting
   - 单元测试
   - 集成测试
   - 覆盖率检查

2. **前端测试**
   - 测试套件
   - 构建验证

3. **代码质量**
   - 表情符号检查
   - 文件大小检查
   - 提交信息格式

4. **安全扫描**
   - 依赖漏洞扫描
   - 密钥扫描
   - 静态代码分析

5. **Docker 构建**
   - 后端镜像构建
   - 前端镜像构建

### 本地运行 CI 检查

```bash
# 运行所有后端检查
cd backend
npm run lint
npm run test:all
npm run test:coverage

# 运行前端检查
cd frontend
npm test -- --coverage --watchAll=false
npm run build

# 检查表情符号
python scripts/remove-emojis.py --check

# Docker 构建
docker build -f docker/Dockerfile.backend -t test ./backend
docker build -f docker/Dockerfile.frontend -t test ./frontend
```

## 发布流程

### 版本号规则

使用 [语义化版本](https://semver.org/)：

- `MAJOR.MINOR.PATCH`
- MAJOR：不兼容的 API 变更
- MINOR：向下兼容的功能新增
- PATCH：向下兼容的问题修正

### 创建发布

1. **更新版本号**

```bash
# 在 backend 和 frontend 的 package.json 中更新版本
npm version patch  # 或 minor, major
```

2. **更新 CHANGELOG.md**

记录本次发布的变更内容。

3. **创建版本标签**

```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

4. **自动部署**

版本标签推送后，CD Pipeline 会自动：
- 构建 Docker 镜像
- 推送到容器注册表
- 部署到生产环境（需手动批准）

## 获取帮助

如有问题，请：

1. 查看 [文档](docs/)
2. 搜索现有 [Issues](https://github.com/ZixunHuangUPenn/hrsystem/issues)
3. 创建新的 Issue 描述问题
4. 联系维护者

## 行为准则

- 尊重所有贡献者
- 提供建设性的反馈
- 接受不同的观点
- 专注于对项目最有利的事情

感谢您的贡献！
