# 阿里云部署说明

## 部署架构

```
GitHub Actions (自动构建)
    ↓
阿里云容器镜像服务 (ACR)
    ↓
后端ECS集群 → 后端负载均衡器 (内网SLB)
前端ECS集群 → 前端负载均衡器 (公网SLB)
```

## 前置准备

1. 使用Terraform项目依次部署：network → security → loadbalance → ecs-clusters
2. 记录输出的ECS实例IP、负载均衡器ID等信息
3. 在每个ECS实例上安装Docker：
   ```bash
   curl -fsSL https://get.docker.com | sh
   systemctl start docker
   systemctl enable docker
   ```

## GitHub Secrets配置

在仓库 Settings → Secrets and variables → Actions 中添加以下secrets：

### 阿里云访问 (3个)
```
ALIYUN_ACCESS_KEY_ID       # 阿里云AccessKey ID
ALIYUN_ACCESS_KEY_SECRET   # 阿里云AccessKey Secret
ALIYUN_REGION              # 区域，如 cn-beijing
```

### 容器镜像服务 (4个)
```
ACR_REGISTRY               # ACR地址，如 registry.cn-beijing.aliyuncs.com
ACR_NAMESPACE              # 命名空间，建议 hrsystem
ACR_USERNAME               # ACR用户名
ACR_PASSWORD               # ACR密码
```

### ECS实例 (3个)
```
BACKEND_ECS_IPS            # 后端ECS内网IP，逗号分隔，如 172.16.0.10,172.16.0.11
FRONTEND_ECS_IPS           # 前端ECS内网IP，逗号分隔，如 172.16.1.10,172.16.1.11
ECS_SSH_KEY                # SSH私钥内容
```

### 负载均衡器 (2个)
```
BACKEND_SLB_ID             # 后端负载均衡器ID
FRONTEND_SLB_ID            # 前端负载均衡器ID
```

### 应用配置 (9个)
```
BACKEND_API_URL            # 后端API地址，前端将连接此地址
DB_HOST                    # MySQL主机地址
DB_PORT                    # MySQL端口，默认3306
DB_NAME                    # 数据库名
DB_USER                    # 数据库用户
DB_PASSWORD                # 数据库密码
REDIS_HOST                 # Redis主机地址
REDIS_PORT                 # Redis端口，默认6379
JWT_SECRET                 # JWT密钥，至少32字符
ENCRYPTION_KEY             # AES加密密钥，必须32字符
```

参考 `secrets.template.env` 文件填写。

## 部署方式

### 自动部署
推送到main分支自动触发：
```bash
git push origin main
```

### 手动部署
1. 进入仓库Actions标签
2. 选择"Deploy to Aliyun"工作流
3. 点击"Run workflow"
4. 选择部署选项：
   - Deploy All Services: 部署全部服务
   - Deploy Backend Service: 仅部署后端
   - Deploy Frontend Service: 仅部署前端
   - Skip Build Cache: 跳过缓存（首次部署建议勾选）

## 部署流程

工作流包含3个阶段：

1. **Prepare**: 检测文件变更，决定部署哪些服务
2. **Build and Push**: 构建Docker镜像并推送到ACR
3. **Deploy to ECS**: SSH到ECS实例，拉取镜像，启动容器

## 验证部署

### 查看容器状态
```bash
# 后端
ssh root@<后端ECS_IP> "docker ps"
ssh root@<后端ECS_IP> "docker logs hrsystem-backend"

# 前端
ssh root@<前端ECS_IP> "docker ps"
ssh root@<前端ECS_IP> "docker logs hrsystem-frontend"
```

### 检查负载均衡器
```bash
aliyun slb DescribeHealthStatus \
  --RegionId <区域> \
  --LoadBalancerId <负载均衡器ID>
```

### 测试访问
```bash
# 后端健康检查
curl http://<后端SLB地址>:3000/health

# 前端访问
curl https://<前端域名>/
```

## 回滚操作

### 方法1: 自动回滚
```bash
git revert HEAD
git push origin main
# 工作流将自动部署上一个版本
```

### 方法2: 手动回滚
```bash
# SSH到问题实例
ssh root@<ECS_IP>

# 停止当前容器
docker stop hrsystem-backend
docker rm hrsystem-backend

# 查看可用镜像
docker images

# 启动上一个版本
docker run -d --name hrsystem-backend \
  --restart unless-stopped \
  -p 3000:3000 \
  <上一个镜像标签>
```

## 常见问题

### 镜像推送失败
- 检查ACR凭据是否正确
- 确认ACR命名空间和仓库已创建

### SSH连接失败
- 验证SSH密钥正确
- 检查ECS安全组是否允许GitHub Actions访问

### 容器启动失败
- 检查环境变量配置
- 验证数据库和Redis连接
- 查看容器日志：`docker logs hrsystem-backend`

### 健康检查失败
- 确认健康检查端点正常响应
- 检查安全组规则允许SLB到ECS的流量
- 验证容器端口正确暴露

## 生成密钥命令

```bash
# 生成JWT密钥（至少32字符）
openssl rand -base64 32

# 生成加密密钥（正好32字符）
openssl rand -base64 32 | head -c 32

# 生成SSH密钥对
ssh-keygen -t rsa -b 4096 -f ~/.ssh/aliyun_ecs
```
