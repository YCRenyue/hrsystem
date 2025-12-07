# CI/CD 快速开始指南

5 分钟快速配置 GitHub Actions CI/CD 流程。

## 前置条件

- ✅ GitHub 仓库已创建
- ✅ 代码已推送到 GitHub
- ✅ 本地开发环境正常运行

## 步骤 1: 确认工作流文件

检查以下文件是否存在：

```
.github/
├── workflows/
│   ├── ci.yml          # CI 工作流
│   └── cd.yml          # CD 工作流
├── ISSUE_TEMPLATE/
│   ├── bug_report.md
│   └── feature_request.md
├── pull_request_template.md
└── CONTRIBUTING.md
```

如果文件已存在，说明 CI/CD 已配置完成！

## 步骤 2: 推送到 GitHub

```bash
# 添加所有文件
git add .

# 提交（使用规范的提交信息）
git commit -m "feat(ci): add basic CI/CD workflows"

# 推送到 GitHub
git push origin main
```

## 步骤 3: 查看 CI 运行

1. 访问 GitHub 仓库
2. 点击 "Actions" 标签
3. 查看 "CI Pipeline" 工作流运行

第一次运行可能需要 3-5 分钟。

## 步骤 4: 验证 CI 状态

在工作流运行完成后，检查：

- ✅ Backend Linting - 通过
- ✅ Frontend Build - 通过
- ✅ Code Quality - 通过
- ✅ CI Summary - 通过

## 步骤 5: 添加状态徽章（可选）

CI 徽章已自动添加到 README.md：

```markdown
[![CI Pipeline](https://github.com/your-username/hrsystem/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/hrsystem/actions/workflows/ci.yml)
```

将 `your-username` 替换为您的 GitHub 用户名。

## 日常使用

### 创建功能分支

```bash
# 创建新分支
git checkout -b feature/new-feature

# 开发代码...

# 提交代码
git add .
git commit -m "feat(module): add new feature"

# 推送分支
git push origin feature/new-feature
```

### 创建 Pull Request

1. 访问 GitHub 仓库
2. 点击 "Pull requests" → "New pull request"
3. 选择您的分支
4. 填写 PR 描述
5. 创建 PR

CI 会自动运行检查。

### 本地预检查

提交前在本地运行：

```bash
# 后端检查
cd backend && npm run lint

# 前端构建
cd frontend && npm run build
```

## 故障排查

### CI 失败：Backend Linting

```bash
cd backend
npm run lint
# 修复 linting 错误
```

### CI 失败：Frontend Build

```bash
cd frontend
npm ci
npm run build
# 查看错误并修复
```

### CI 失败：表情符号检查

- 移除代码文件中的表情符号
- 表情符号只允许在 `requirement.md` 中使用

## 下一步

- 📖 阅读完整文档：[docs/ci-cd-basic.md](ci-cd-basic.md)
- 👥 查看贡献指南：[.github/CONTRIBUTING.md](../.github/CONTRIBUTING.md)
- 🔍 了解提交规范：使用 Conventional Commits

## 获取帮助

如有问题：
1. 查看 [CI/CD 基础文档](ci-cd-basic.md)
2. 查看 GitHub Actions 运行日志
3. 创建 Issue 寻求帮助

---

恭喜！您的 CI/CD 流程已配置完成！🎉
