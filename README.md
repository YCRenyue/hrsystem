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
# 克隆项目
git clone https://github.com/ZixunHuangUPenn/hrsystem.git
cd hrsystem

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库和钉钉API信息

# 初始化数据库
npm run db:migrate

# 启动开发服务
npm run dev
```

### Docker 部署

```bash
# 构建镜像
docker build -t hrsystem .

# 使用 Docker Compose 启动
docker-compose up -d
```

## 📖 开发文档

- [📋 需求分析文档](./analysis.md)
- [📝 详细开发需求](./requirement.md)
- [🏗️ 架构设计文档](./docs/architecture.md)
- [🔌 API接口文档](./docs/api.md)
- [🎨 前端开发指南](./docs/frontend.md)
- [⚙️ 后端开发指南](./docs/backend.md)
- [📊 数据库设计](./docs/database.md)

## 🛣️ 开发路线图

### 阶段一：基础环境搭建 (3天)

- [X] 项目架构设计
- [X] 需求文档完善
- [ ] 前后端框架初始化
- [ ] 数据库设计和建表
- [ ] 钉钉开发环境配置

### 阶段二：数据安全和权限系统 (3天)

- [ ] AES-256数据加密系统
- [ ] 三级权限验证中间件
- [ ] 操作审计日志系统

### 阶段三：钉钉集成基础功能 (3天)

- [ ] 钉钉API封装
- [ ] OAuth认证系统
- [ ] 消息推送服务

### 阶段四：员工信息管理 (4天)

- [ ] Excel批量导入功能
- [ ] 在线表单录入
- [ ] 入职流程自动化
- [ ] HR管理界面

### 阶段五：智能问答系统 (5天)

- [ ] 知识库构建
- [ ] 语音识别集成
- [ ] 智能回复引擎
- [ ] 多模态交互界面

### 阶段六：考勤和报表系统 (4天)

- [ ] 考勤数据管理
- [ ] 假期管理系统
- [ ] 多维度报表生成
- [ ] 数据可视化

### 阶段七：测试和部署 (3天)

- [ ] 单元测试和集成测试
- [ ] 性能优化
- [ ] 云端部署配置
- [ ] 监控和日志系统

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
