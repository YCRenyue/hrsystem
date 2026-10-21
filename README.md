# 企业人事管理系统 (HR Management System)

[![GitHub Stars](https://img.shields.io/github/stars/ZixunHuangUPenn/hrsystem?style=flat-square)](https://github.com/ZixunHuangUPenn/hrsystem/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/ZixunHuangUPenn/hrsystem?style=flat-square)](https://github.com/ZixunHuangUPenn/hrsystem/issues)
[![License](https://img.shields.io/github/license/ZixunHuangUPenn/hrsystem?style=flat-square)](LICENSE)
[![CI Pipeline](https://github.com/ZixunHuangUPenn/hrsystem/actions/workflows/ci.yml/badge.svg)](https://github.com/ZixunHuangUPenn/hrsystem/actions/workflows/ci.yml)

## 📋 项目概述

基于云端部署的企业人事管理系统，深度集成钉钉平台，支持智能问答、流程自动化以及多维度报表统计。系统具备完整的员工信息管理、考勤管理、薪酬管理等功能，提供语音/文字交互体验和智能化权限管理。

## 🎯 项目目标

- 🌐 **云端部署**：基于云服务的人事管理平台，支持高可用和可扩展
- 🔗 **钉钉深度集成**：消息推送、OAuth认证、组织架构同步
- 🤖 **智能体问答**：支持语音与文字交互的AI助手
- 📊 **数据管理与分析**：员工信息、考勤、假期、薪酬等全方位管理

## ✨ 核心功能

### 👥 员工信息管理

- **多渠道录入**：Excel批量导入、在线表单录入、员工自助完善
- **入职流程自动化**：入职当日自动推送登记表，多渠道通知
- **三级权限体系**：管理员、HR、员工分级权限控制
- **数据安全保障**：敏感信息AES-256加密存储

### 🤖 智能体问答服务

- **多模态交互**：支持语音和文字输入
- **知识库覆盖**：
  - 考勤制度和规章
  - 社保与公积金政策
  - 假期规则和流程
  - 薪酬发放制度
  - 公司规章制度

### 🔄 自动化流程

- **入职流程**：
  - 入职前邮件/钉钉提醒
  - 入职当天推送登记表链接
  - 入职一周后欢迎消息
  - 新员工培训日程提醒
- **日常管理**：
  - 社保缴纳情况推送
  - 劳动合同到期提醒
  - 月度出差补助统计
  - 食堂就餐费用统计

### 📈 报表与分析

- **假期管理**：年假、调休、事假等多维度统计
- **考勤分析**：迟到、早退、缺勤情况报表
- **人员变动**：入职/离职人员统计分析
- **权限控制**：基于角色的报表访问权限

## 🏗️ 系统架构

### 技术栈

- **前端**：React + Ant Design(antd v5)
- **后端**：Node.js + Express
- **数据库**：MySQL
- **文件存储**：阿里云OSS
- **部署**：阿里云ACR(Docker)

### 核心服务

```
┌─────────────────┬─────────────────┬─────────────────┐
│   前端应用      │   移动端适配    │   钉钉小程序      │
├─────────────────┼─────────────────┼─────────────────┤
│            	 API 网关 (Nginx)                     │
├─────────────────┼─────────────────┼─────────────────┤
│  员工管理服务   │  智能问答服务   │  报表分析服务      │
├─────────────────┼─────────────────┼─────────────────┤
│  考勤管理服务   │  消息推送服务   │  文件管理服务      │
├─────────────────┼─────────────────┼─────────────────┤
│           	数据库集群 (MySQL)     		      │
└─────────────────┴─────────────────┴─────────────────┘
```

## 🗄️ 数据库设计

### 核心数据表

- **员工表 (employees)**：员工基础信息，支持加密存储
- **考勤表 (attendance)**：每日考勤记录
- **年假表 (annual_leave)**：假期申请和统计
- **社保公积金表 (social_insurance)**：缴纳情况记录
- **出差补助表 (business_trip)**：出差费用明细
- **就餐表 (dining_records)**：食堂消费记录
- **入职流程表 (onboarding_process)**：入职流程跟踪
- **权限管理表 (user_permissions)**：用户权限配置
- **操作日志表 (operation_logs)**：系统操作审计

## 🔐 安全特性

### 数据安全

- **敏感信息加密**：身份证号码、银行卡号AES-256加密
- **数据脱敏显示**：手机号中间位脱敏显示
- **HTTPS传输**：全站SSL加密传输
- **定期备份**：自动化数据备份策略

### 权限控制

- **三级权限体系**：
  - 🔴 **管理员**：系统全局管理、用户权限配置
  - 🟡 **HR人事**：员工信息管理、报表查看导出
  - 🟢 **员工**：个人信息查看编辑、自助服务

### 审计日志

- **操作记录**：所有敏感操作完整日志
- **数据变更追踪**：修改前后数据对比
- **异常监控**：异常操作实时告警

## 📱 支持平台

- 🖥️ **PC网页端**：完整功能体验
- 📱 **移动端H5**：响应式适配
- 💬 **钉钉工作台**：原生集成体验
- 🎤 **语音交互**：智能语音问答

## 🚀 快速开始

### 环境要求

- Node.js 20.19.6
- MySQL >= 8.0 或 PostgreSQL >= 12
- Redis >= 6.0
- Docker >= 20.0 (可选)

### 安装部署

```bash
# 1. 克隆项目
git clone https://github.com/ZixunHuangUPenn/hrsystem.git
cd hrsystem

# 2. 安装全部依赖（根目录、backend、frontend）
npm run install:all

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，配置数据库连接、JWT_SECRET、ENCRYPTION_KEY、钉钉 API 等
# 年假结转上限和社保公积金比例可按 backend/.env.example 中的计算变量覆盖

# 4. 初始化数据库（必须依次执行）
npm run db:migrate    # 创建表结构
npm run db:seed       # 注入初始化种子数据（默认部门、admin 账号、测试数据等）
```

#### 启动开发服务

```bash
# 方式一：根目录一键并行启动前后端
npm run dev

# 方式二：分别在两个终端启动
# 终端 1：启动后端 (http://localhost:3001)
cd backend
npm run dev          # 开发模式（nodemon 热重载）
# 或 npm start       # 生产模式

# 终端 2：启动前端 (http://localhost:3000)
cd frontend
npm start            # 开发模式（CRA 开发服务器）
```

#### 生产环境构建

```bash
# 构建前端静态资源
cd frontend && npm run build

# 启动后端
cd backend && npm start
```

### Docker 部署

```bash
# 构建镜像并启动所有服务（前端 / 后端 / MySQL / Redis / Nginx）
npm run docker:build
npm run docker:up

# 首次启动后仍需进入后端容器执行迁移和种子
docker exec -it hrsystem-backend npm run db:migrate
docker exec -it hrsystem-backend npm run db:seed

# 查看日志 / 关闭服务
npm run docker:logs
npm run docker:down
```

## 📖 开发文档

- [📋 需求分析文档](./analysis.md)
- [📝 详细开发需求与进度](./requirement.md)
- [🛠️ 开发指南与代码规范（CLAUDE.md）](./CLAUDE.md)
- [📦 测试数据说明](./sample_data/import_template_guide.md)

## 🛣️ 开发路线图

> 整体完成度：**约 80%** ｜ 当前阶段：**阶段十三 - 数据整合 Dashboard 增强**
> 详细进度请参阅 [requirement.md](./requirement.md)

### 阶段一：基础环境搭建 ✅ 已完成

- [X] 项目架构设计
- [X] 需求文档完善
- [X] 前后端框架初始化（React 19 + Express 5）
- [X] 数据库设计与建表（Sequelize 迁移 + 种子数据）
- [ ] 钉钉开发环境配置（暂缓，已在阶段四接入）

### 阶段二：数据安全和权限系统 🟡 进行中（约 80%）

- [X] AES-256 数据加密与字段哈希搜索
- [X] JWT 鉴权与基础角色验证中间件
- [X] 用户管理 API（admin 调整权限 / 重置密码）
- [ ] 数据范围（all/department/self）细粒度过滤
- [X] 操作审计日志（基础完成，敏感操作拦截待补）
- [X] 敏感数据中间件保留 Date 对象修复

### 阶段三：钉钉集成与通知系统 🟡 进行中（约 70%）

- [X] 钉钉 API 封装（access_token 缓存、用户查询）
- [X] NotificationService 多渠道通知（钉钉 + 邮件 + 站内信）
- [X] SchedulerService 定时任务（入职推送、合同到期、月度统计等 6 项）
- [X] 站内通知中心（in-app notifications）
- [ ] 钉钉 OAuth 登录与组织架构同步

### 阶段四：员工信息管理 ✅ 已完成（约 90%）

- [X] Excel 批量导入 / 导出（87 个测试通过，覆盖率 85%+）
- [X] 在线表单录入与员工信息编辑
- [X] HR 管理界面（员工列表、搜索筛选、分页）
- [X] 部门管理（树形结构、CRUD）
- [X] 用户账号自动创建（手动 / 批量导入均支持）
- [ ] 入职流程自动化（30%，待完成自助完善表单）

### 阶段五：制度确认模块 ✅ 已完成（2026-04-01）

- [X] 公司管理规章制度 9 页分页阅读 + 末页签署
- [X] 员工培训承诺函（法律版本 + 变量自动填充）
- [X] 甲乙双方信息员工可编辑
- [X] training_pledges 表存储费用 / 服务年限

### 阶段六：考勤与请假 ✅ 已完成

- [X] 考勤打卡 CRUD 与统计 API
- [X] 考勤卡表 Excel 导入（识别 1.3.4 / 5.6.7 等多 Sheet）
- [X] 考勤报表页（迟到 / 早退 / 请假 / 加班 TOP 榜）
- [X] 员工自助请假申请 + admin 审批 + 站内通知

### 阶段七：业务数据模块 ✅ 已完成（2025-12-05）

- [X] 年假管理（应休 / 已休 / 剩余自动计算）
- [X] 社保公积金管理
- [X] 出差补助管理（支持员工姓名搜索）
- [X] 报销管理（admin/manager 代办时自动绑定员工）
- [X] 食堂报表（每日 / 每周中晚餐人数 + 个人汇总）
- [X] 各模块 Excel 导入导出 + 模板下载

### 阶段八：智能问答系统 ⏳ 待开始

- [ ] 知识库建设（考勤 / 社保 / 假期 / 薪酬等）
- [ ] 关键词匹配问答引擎（一期）
- [ ] LLM API 接入（二期）
- [ ] 前端悬浮聊天窗口
- [ ] 钉钉机器人群聊问答

### 阶段九：Dashboard 数据整合 🟡 进行中

- [X] 基础统计卡片（员工总数、考勤率、请假等）
- [X] 入职趋势图表
- [ ] 部门分布、考勤异常、假期使用等可视化图表
- [ ] 待审批 / 提醒事项面板
- [ ] 个性化布局与移动端适配

### 阶段十：测试与部署 🟡 进行中

- [X] 后端单元测试（87 个用例，覆盖率 85%+）
- [ ] 前端单元测试（覆盖率 0%，待补充）
- [ ] 端到端集成测试
- [ ] 云端部署与监控告警

## 📊 性能指标

- **并发支持**：500+ 用户同时访问
- **响应时间**：智能问答 < 2秒，页面加载 < 1秒
- **可用性**：99.9% 系统可用率
- **数据安全**：100% 敏感数据加密覆盖

## 📄 许可证

本项目采用 MIT 许可证。详情请参阅 [LICENSE](LICENSE) 文件。

## 👥 团队成员

- **项目负责人**：[@yuhaoJQKA](https://github.com/yuhaoJQKA) [@ZixunHuangUPenn](https://github.com/ZixunHuangUPenn)
- **产品设计**：[@yuhaoJQKA](https://github.com/yuhaoJQKA) [@ZixunHuangUPenn](https://github.com/ZixunHuangUPenn)
- **前端开发**：[@ZixunHuangUPenn](https://github.com/ZixunHuangUPenn)
- **后端开发**：[@ZixunHuangUPenn](https://github.com/ZixunHuangUPenn)
- **测试工程师**：[@ZixunHuangUPenn](https://github.com/ZixunHuangUPenn)

📈 查看项目进展：[项目看板](https://github.com/ZixunHuangUPenn/hrsystem/projects)
