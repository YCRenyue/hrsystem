# GitHub Actions 部署配置

本目录包含 GitHub Actions 自动化部署到阿里云 ECS 的配置。

## 文件说明

- `workflows/deploy.yml` - 自动化部署工作流
- `secrets.env` - GitHub Secrets 配置模板

## 快速开始

### 1. 配置 GitHub Secrets

编辑 `secrets.env` 文件，填写所有配置值，然后添加到 GitHub：

```
仓库 Settings → Secrets and variables → Actions → New repository secret
```

需要配置 20 个 secrets，详见 `secrets.env` 文件。

### 2. 核心配置项

**必需（6 项）**:
- `ALIYUN_ACCESS_KEY_ID` / `ALIYUN_ACCESS_KEY_SECRET` - RAM 访问密钥
- `ACR_USERNAME` / `ACR_PASSWORD` - 容器镜像仓库凭据
- `ACR_NAMESPACE` - 推荐使用 `hrsystem`
- `ECS_SSH_KEY` - SSH 私钥（用于连接 ECS）

**数据库（6 项）**:
- 方案 A: 使用 RDS MySQL + Redis（推荐生产）
- 方案 B: 在 ECS 上运行 Docker 容器（快速测试）

**已知配置**:
- `ACR_REGISTRY`: `crpi-1f9h7rkbm8zj38tu.cn-zhangjiakou.personal.cr.aliyuncs.com`
- `BACKEND_ECS_IPS`: `10.1.2.202`
- `FRONTEND_ECS_IPS`: `10.1.2.201`
- `JWT_SECRET` / `ENCRYPTION_KEY`: 已在 `secrets.env` 中生成

### 3. SSH 密钥配置

生成 SSH 密钥并添加到 ECS：

```bash
# 生成密钥对
ssh-keygen -t rsa -b 4096 -f ~/.ssh/aliyun_ecs_hrsystem -N ""

# 添加公钥到 ECS
ssh root@<ECS公网IP>
echo "$(cat ~/.ssh/aliyun_ecs_hrsystem.pub)" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

将私钥内容复制到 GitHub Secret: `ECS_SSH_KEY`

### 4. 快速测试数据库（可选）

如果暂时没有 RDS，可以在后端 ECS 上运行 Docker 容器：

```bash
ssh root@<后端ECS公网IP>

# MySQL
docker run -d --name mysql \
  -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=hr_system_root \
  -e MYSQL_DATABASE=hrsystem \
  -e MYSQL_USER=hrsystem_user \
  -e MYSQL_PASSWORD=your_password \
  mysql:8.0

# Redis
docker run -d --name redis -p 6379:6379 redis:alpine
```

然后配置:
- `DB_HOST`: `10.1.2.202`
- `REDIS_HOST`: `10.1.2.202`

### 5. 触发部署

**自动部署**: 推送代码到 `main` 分支

**手动部署**: GitHub → Actions → "Deploy to Aliyun ECS" → Run workflow

### 6. 验证部署

```bash
# 检查后端
ssh root@10.1.2.202
docker ps | grep hrsystem-backend
docker logs hrsystem-backend
curl http://localhost:3001/health

# 检查前端
ssh root@10.1.2.201
docker ps | grep hrsystem-frontend
curl http://localhost/
```

## 故障排查

1. **部署失败**: 检查 GitHub Actions 日志
2. **SSH 连接失败**: 验证 SSH 密钥配置
3. **镜像推送失败**: 检查 ACR 凭据
4. **容器启动失败**: 检查数据库连接配置

## 相关链接

- [阿里云 RAM 控制台](https://ram.console.aliyun.com/)
- [阿里云 ACR 控制台](https://cr.console.aliyun.com/)
- [阿里云 ECS 控制台](https://ecs.console.aliyun.com/)
