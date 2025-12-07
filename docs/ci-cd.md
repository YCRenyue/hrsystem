# CI/CD 流程文档

本文档描述了HR系统的持续集成和持续部署(CI/CD)流程。

## 概述

项目使用 GitHub Actions 实现自动化的CI/CD流程，确保每次代码提交都经过严格的质量检查。

## CI/CD 工作流

### 1. CI Pipeline (持续集成)

**触发条件**：
- Push到 `main`, `develop`, `feature/*`, `fix/*` 分支
- 向 `main` 或 `develop` 分支发起 Pull Request

**工作流文件**：`.github/workflows/ci.yml`

#### 执行步骤

##### 后端测试 (Backend Tests)
- 启动 MySQL 8.0 和 Redis 7 服务
- 安装 Node.js 依赖
- 创建测试环境配置
- 运行数据库迁移
- 执行代码 Linting
- 运行测试套件并生成覆盖率报告
- 上传覆盖率报告到 Codecov

**环境要求**：
- Node.js 18.x
- MySQL 8.0
- Redis 7

##### 前端测试 (Frontend Tests)
- 安装 Node.js 依赖
- 运行测试套件
- 构建生产版本
- 上传覆盖率报告
- 上传构建产物

##### 代码质量检查 (Code Quality)
- 检查文件中是否包含表情符号（requirement.md除外）
- 检查文件是否超过500行限制
- 验证提交信息格式（PR时）

##### Docker构建验证 (Docker Build)
- 构建后端 Docker 镜像
- 构建前端 Docker 镜像
- 使用 GitHub Actions 缓存加速构建

##### 集成测试 (Integration Tests)
- 使用 Docker Compose 启动完整环境
- 验证服务健康状态
- 清理测试环境

##### CI摘要 (Summary)
- 汇总所有检查结果
- 如果任何步骤失败，整个流程标记为失败

### 2. CD Pipeline (持续部署)

**触发条件**：
- Push 到 `main` 分支（部署到 Staging）
- 推送版本标签 `v*.*.*`（部署到 Production）

**工作流文件**：`.github/workflows/cd.yml`

#### 执行步骤

##### 构建和推送镜像 (Build and Push)
- 构建 Docker 镜像
- 推送到 GitHub Container Registry
- 自动标记版本

**镜像标签策略**：
- `main` 分支：`main`, `main-<git-sha>`
- 版本标签：`v1.0.0`, `1.0`, `latest`

##### 部署到Staging
- 仅在 `main` 分支触发
- 自动部署到预发布环境
- 环境URL：https://staging.hrsystem.example.com

##### 部署到Production
- 仅在版本标签触发
- 需要手动批准
- 环境URL：https://hrsystem.example.com

##### 回滚机制
- 如果部署失败，自动触发回滚
- 恢复到上一个稳定版本

### 3. Security Checks (安全检查)

**触发条件**：
- Push 到 `main` 或 `develop` 分支
- Pull Request 到 `main` 或 `develop`
- 每周一上午9:00（UTC）定时执行

**工作流文件**：`.github/workflows/security.yml`

#### 执行步骤

##### 依赖扫描
- 运行 `npm audit` 检查已知漏洞
- 使用 Snyk 扫描依赖安全性
- 仅报告 High 及以上级别漏洞

##### 密钥扫描
- 使用 GitLeaks 扫描提交历史
- 检查代码中是否包含硬编码的密钥
- 查找常见的密钥模式

##### 静态代码分析
- 运行 ESLint 代码检查
- 使用 GitHub CodeQL 进行安全分析

##### 许可证合规检查
- 检查所有依赖的许可证
- 确保符合开源许可要求

### 4. Performance Tests (性能测试)

**触发条件**：
- Pull Request 到 `main` 分支
- 每周日凌晨2:00（UTC）定时执行
- 手动触发

**工作流文件**：`.github/workflows/performance.yml`

#### 执行步骤

##### Lighthouse 性能审计
- 构建前端应用
- 运行 Lighthouse CI 测试
- 检查性能、可访问性、SEO等指标
- 上传测试报告

##### Bundle 大小分析
- 分析前端打包文件大小
- 警告如果主 bundle 超过 500KB
- 显示所有 JS 和 CSS 文件大小

##### 负载测试
- 使用 Apache Bench 进行基础负载测试
- 使用 k6 进行高级负载测试
- 测试场景：
  - 100个请求，10个并发
  - 逐步增加到20个并发用户
  - 持续1分钟
- 性能阈值：
  - 95%的请求 < 500ms
  - 错误率 < 10%

##### 内存泄漏检测
- 检查潜在的内存泄漏
- 可集成 clinic.js 或 memlab

## 状态徽章

在 README.md 中添加以下徽章以显示CI/CD状态：

```markdown
![CI Pipeline](https://github.com/yourusername/hrsystem/actions/workflows/ci.yml/badge.svg)
![Security](https://github.com/yourusername/hrsystem/actions/workflows/security.yml/badge.svg)
![Performance](https://github.com/yourusername/hrsystem/actions/workflows/performance.yml/badge.svg)
```

## 环境变量和密钥

### GitHub Secrets 配置

在 GitHub 仓库设置中配置以下 Secrets：

#### 必需的 Secrets
- `GITHUB_TOKEN`：自动提供，用于推送Docker镜像
- `SNYK_TOKEN`：Snyk API token（用于安全扫描）

#### 可选的 Secrets（用于部署）
- `SSH_PRIVATE_KEY`：SSH私钥（用于服务器部署）
- `DEPLOY_HOST`：部署服务器地址
- `DEPLOY_USER`：部署用户名
- `DOCKER_HUB_USERNAME`：Docker Hub用户名（如使用Docker Hub）
- `DOCKER_HUB_TOKEN`：Docker Hub访问令牌

### 环境配置

在 GitHub 仓库设置中创建以下环境：

#### Staging 环境
- 名称：`staging`
- URL：https://staging.hrsystem.example.com
- 保护规则：无（自动部署）

#### Production 环境
- 名称：`production`
- URL：https://hrsystem.example.com
- 保护规则：
  - 需要审批者
  - 等待计时器：5分钟
  - 仅允许特定分支：`main`, `v*.*.*`

## 本地测试

### 运行 CI 检查

在提交代码前，可以在本地运行以下命令模拟CI检查：

```bash
# 后端 Linting 和测试
cd backend
npm run lint
npm run test:all
npm run test:coverage

# 前端测试和构建
cd frontend
npm test -- --coverage --watchAll=false
npm run build

# 检查表情符号
python scripts/remove-emojis.py --check

# Docker 构建测试
docker build -f docker/Dockerfile.backend -t hrsystem-backend:test ./backend
docker build -f docker/Dockerfile.frontend -t hrsystem-frontend:test ./frontend
```

### 使用 Act 本地运行 GitHub Actions

安装 [act](https://github.com/nektos/act)：

```bash
# macOS
brew install act

# Windows (使用 Chocolatey)
choco install act-cli
```

运行工作流：

```bash
# 运行 CI 工作流
act push -W .github/workflows/ci.yml

# 运行特定 job
act push -W .github/workflows/ci.yml -j backend-tests

# 使用自定义 secrets
act push --secret-file .secrets
```

## 部署流程

### 部署到 Staging

1. 合并代码到 `main` 分支
2. CI Pipeline 自动运行
3. 如果所有检查通过，自动构建 Docker 镜像
4. 自动部署到 Staging 环境
5. 验证 Staging 环境功能

### 部署到 Production

1. 确保 Staging 环境测试通过
2. 创建版本标签：
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```
3. CD Pipeline 自动触发
4. 构建并推送 Docker 镜像
5. 等待手动批准
6. 部署到 Production 环境
7. 验证 Production 环境

### 回滚操作

如果生产环境出现问题：

**自动回滚**：
- CD Pipeline 检测到部署失败会自动回滚

**手动回滚**：
```bash
# 方法1：推送上一个稳定版本的标签
git tag -a v1.0.0-rollback -m "Rollback to v1.0.0" <previous-commit-sha>
git push origin v1.0.0-rollback

# 方法2：在服务器上手动切换镜像版本
docker pull ghcr.io/username/hrsystem-backend:v1.0.0
docker pull ghcr.io/username/hrsystem-frontend:v1.0.0
docker-compose up -d
```

## 监控和通知

### 失败通知

可以配置 GitHub Actions 在失败时发送通知：

1. **Slack 通知**：
   - 添加 Slack Webhook Secret
   - 在工作流中添加通知步骤

2. **Email 通知**：
   - GitHub 自动发送工作流失败的邮件

3. **企业微信/钉钉通知**：
   - 集成 Webhook 通知

### 性能监控

建议集成以下监控工具：
- **Sentry**：错误追踪
- **New Relic**：应用性能监控
- **Prometheus + Grafana**：系统指标监控
- **ELK Stack**：日志聚合和分析

## 最佳实践

### 提交代码

1. **提交前检查**：
   ```bash
   npm run lint
   npm test
   ```

2. **遵循提交信息规范**：
   ```
   feat(module): add new feature
   fix(module): fix bug description
   docs: update documentation
   test: add tests for feature
   refactor: improve code structure
   ```

3. **创建功能分支**：
   ```bash
   git checkout -b feature/new-feature
   git checkout -b fix/bug-description
   ```

### Pull Request

1. **描述清晰**：说明变更内容和原因
2. **关联 Issue**：使用 `Fixes #123` 或 `Closes #456`
3. **通过所有检查**：确保 CI Pipeline 全部通过
4. **请求审查**：至少一个团队成员审查

### 版本管理

使用 [语义化版本](https://semver.org/)：
- `v1.0.0`：主版本.次版本.修订版本
- 主版本：不兼容的 API 变更
- 次版本：向下兼容的功能新增
- 修订版本：向下兼容的问题修正

### 环境一致性

- 使用 Docker 确保所有环境一致
- 在 `.env.example` 中记录所有环境变量
- 不要在代码中硬编码配置
- 使用环境特定的配置文件

## 故障排查

### CI Pipeline 失败

**后端测试失败**：
```bash
# 查看详细日志
cd backend
npm run test:all -- --verbose

# 单独运行失败的测试
npx jest path/to/test.js
```

**前端构建失败**：
```bash
# 清理缓存重新构建
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Docker 构建失败**：
```bash
# 本地测试构建
docker build -f docker/Dockerfile.backend -t test ./backend

# 查看详细构建日志
docker build --progress=plain -f docker/Dockerfile.backend -t test ./backend
```

### 部署问题

**服务无法启动**：
1. 检查环境变量配置
2. 查看容器日志：`docker-compose logs -f`
3. 验证数据库连接
4. 检查端口占用

**性能下降**：
1. 查看性能测试报告
2. 检查数据库查询性能
3. 分析应用日志
4. 监控系统资源使用

## 参考资源

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Docker 文档](https://docs.docker.com/)
- [Lighthouse CI 文档](https://github.com/GoogleChrome/lighthouse-ci)
- [k6 负载测试文档](https://k6.io/docs/)
- [Snyk 安全扫描文档](https://docs.snyk.io/)

## 更新历史

- 2025-01-XX：初始版本创建
- 添加完整的 CI/CD 工作流
- 集成安全检查和性能测试
