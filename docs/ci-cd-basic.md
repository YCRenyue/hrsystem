# CI/CD 基础配置文档

本文档描述了HR系统的基础 CI/CD 流程配置。

## 概述

项目使用 GitHub Actions 实现基础的自动化测试和构建流程。由于数据库部署在本地，CI 流程不包含数据库相关的测试。

## CI Pipeline (持续集成)

### 触发条件

- Push 到 `main`, `develop`, `feature/*`, `fix/*` 分支
- 向 `main` 或 `develop` 分支发起 Pull Request

### 工作流文件

`.github/workflows/ci.yml`

### 检查项目

#### 1. 后端 Linting (Backend Linting)

**执行内容**：
- 安装 Node.js 18.x
- 安装后端依赖（`npm ci`）
- 运行 ESLint 代码检查

**本地运行**：
```bash
cd backend
npm run lint
```

#### 2. 前端构建 (Frontend Build)

**执行内容**：
- 安装 Node.js 18.x
- 安装前端依赖（`npm ci`）
- 构建生产版本
- 上传构建产物（保留 7 天）

**本地运行**：
```bash
cd frontend
npm ci
npm run build
```

#### 3. 代码质量检查 (Code Quality)

**执行内容**：
- 检查文件中是否包含表情符号（requirement.md 除外）
- 检查文件是否超过 500 行限制（仅警告）

**规则**：
- 禁止在代码文件中使用表情符号
- 建议文件不超过 500 行

#### 4. CI 摘要 (Summary)

**执行内容**：
- 汇总所有检查结果
- 如果任何检查失败，整个 CI 标记为失败

## CD Pipeline (持续部署)

### 触发条件

- Push 到 `main` 分支
- 推送版本标签 `v*.*.*`

### 工作流文件

`.github/workflows/cd.yml`

### 执行内容

#### Docker 镜像构建

**执行步骤**：
1. 构建后端 Docker 镜像（`hrsystem-backend:latest`）
2. 构建前端 Docker 镜像（`hrsystem-frontend:latest`）
3. 使用 GitHub Actions 缓存加速构建

**注意**：镜像只在 GitHub Actions 中构建验证，不会推送到镜像仓库。

### 手动部署流程

由于数据库在本地，需要手动部署：

1. **在服务器上拉取最新代码**
   ```bash
   git pull origin main
   ```

2. **构建 Docker 镜像**
   ```bash
   docker-compose build
   ```

3. **启动服务**
   ```bash
   docker-compose up -d
   ```

4. **查看服务状态**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

## 本地开发流程

### 提交代码前检查

在提交代码前，建议运行以下命令：

```bash
# 1. 后端 Linting
cd backend
npm run lint

# 2. 前端构建测试
cd ../frontend
npm run build

# 3. 检查代码质量（可选）
# 确保没有在代码中使用表情符号
# 确保文件不超过 500 行
```

### 提交信息规范

使用 Conventional Commits 规范：

```
<type>(<scope>): <subject>
```

**类型 (type)**：
- `feat`：新功能
- `fix`：Bug 修复
- `docs`：文档更新
- `style`：代码格式
- `refactor`：重构
- `test`：测试相关
- `chore`：构建或辅助工具

**示例**：
```bash
git commit -m "feat(employees): add employee detail page"
git commit -m "fix(auth): resolve login token issue"
git commit -m "docs: update CI/CD documentation"
```

### 分支策略

- `main`：主分支，用于生产环境
- `develop`：开发分支（可选）
- `feature/*`：新功能分支
- `fix/*`：Bug 修复分支

**创建功能分支**：
```bash
git checkout -b feature/your-feature-name
# 开发完成后
git push origin feature/your-feature-name
# 在 GitHub 上创建 Pull Request
```

## Pull Request 流程

1. **创建 PR**
   - 在 GitHub 上创建 Pull Request
   - 填写 PR 描述（使用模板）

2. **等待 CI 检查**
   - 后端 Linting 通过
   - 前端构建成功
   - 代码质量检查通过

3. **代码审查**
   - 至少一位团队成员审查

4. **合并**
   - 所有检查通过后合并到目标分支

## 查看 CI/CD 状态

### GitHub Actions 页面

1. 访问仓库的 Actions 标签页
2. 查看工作流运行历史
3. 点击具体的运行查看详细日志

### README 徽章

在 README.md 中显示 CI 状态：

![CI Pipeline](https://github.com/ZixunHuangUPenn/hrsystem/actions/workflows/ci.yml/badge.svg)

## 常见问题

### CI 检查失败怎么办？

1. **后端 Linting 失败**
   ```bash
   cd backend
   npm run lint
   # 查看错误并修复
   ```

2. **前端构建失败**
   ```bash
   cd frontend
   npm ci
   npm run build
   # 查看错误日志
   ```

3. **表情符号检查失败**
   - 检查是否在代码文件中使用了表情符号
   - 只允许在 `requirement.md` 中使用表情符号

### 如何跳过 CI 检查？

**不推荐跳过 CI 检查**，但如果必要：

```bash
git commit -m "docs: update readme [skip ci]"
```

### 本地如何模拟 CI 环境？

使用 Docker 运行测试：

```bash
# 安装 act（GitHub Actions 本地运行工具）
# macOS
brew install act

# Windows
choco install act-cli

# 运行 CI 工作流
act push -W .github/workflows/ci.yml
```

## 环境要求

### 开发环境

- Node.js 18.x 或更高版本
- npm 9.x 或更高版本
- Git

### GitHub Actions 环境

- Ubuntu Latest
- Node.js 18.x
- Docker Buildx

## 未来扩展

当数据库迁移到云端后，可以增加：

1. **后端测试**
   - 单元测试
   - 集成测试
   - 覆盖率报告

2. **安全扫描**
   - 依赖漏洞扫描
   - 密钥泄露检测

3. **性能测试**
   - Lighthouse 审计
   - 负载测试

4. **自动部署**
   - 自动部署到云服务器
   - 蓝绿部署
   - 金丝雀发布

## 总结

当前的 CI/CD 配置提供了：
- ✅ 代码质量检查
- ✅ 前端构建验证
- ✅ Docker 镜像构建测试
- ✅ 自动化的检查流程

这是一个基础但实用的 CI/CD 流程，确保每次代码提交都经过基本的质量检查。
