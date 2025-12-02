# 钉钉集成与通知系统使用指南

本文档介绍如何配置和使用HR系统的钉钉集成和自动化通知功能。

## 📋 目录

1. [功能概述](#功能概述)
2. [配置步骤](#配置步骤)
3. [使用说明](#使用说明)
4. [定时任务说明](#定时任务说明)
5. [故障排查](#故障排查)
6. [API参考](#api参考)

---

## 功能概述

### ✨ 核心功能

#### 1. 钉钉API集成 (`DingTalkService`)
- ✅ Access Token 自动获取和刷新（缓存7200秒）
- ✅ 工作通知发送（支持文本、Markdown、链接、OA消息）
- ✅ 用户信息查询（根据userId或手机号）
- ✅ 完整的错误处理和日志记录

#### 2. 统一通知服务 (`NotificationService`)
- ✅ 多渠道支持：钉钉（主渠道）+ 邮件（备用渠道）
- ✅ 自动降级策略：钉钉失败时自动切换到邮件
- ✅ 批量通知发送
- ✅ 8种预定义通知类型

#### 3. 定时任务调度 (`SchedulerService`)
- ✅ 6个自动化任务
- ✅ 手动触发功能（用于测试）
- ✅ 可通过环境变量控制启用/禁用

---

## 配置步骤

### 1. 获取钉钉应用凭证

1. 访问 [钉钉开放平台](https://open-dev.dingtalk.com/)
2. 创建企业内部应用
3. 获取以下信息：
   - `AppKey` (应用标识)
   - `AppSecret` (应用密钥)
   - `AgentId` (应用ID)

### 2. 配置环境变量

编辑 `.env` 文件，添加以下配置：

```bash
# 钉钉集成配置
DINGTALK_APP_KEY=your_app_key_here
DINGTALK_APP_SECRET=your_app_secret_here
DINGTALK_AGENT_ID=your_agent_id_here

# 邮件配置（备用通知渠道）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password
SMTP_FROM=HR System <noreply@yourcompany.com>

# 启用定时任务调度器
ENABLE_SCHEDULER=true

# 日志级别
LOG_LEVEL=INFO
```

### 3. 配置钉钉应用权限

在钉钉开发者后台，为你的应用开启以下权限：

- ✅ 发送工作通知
- ✅ 获取用户信息
- ✅ 企业通讯录只读权限

### 4. 重启应用

```bash
# 重启后端服务
cd backend
npm start
```

---

## 使用说明

### 手动发送通知

#### 示例 1: 发送入职登记表通知

```javascript
const notificationService = require('./services/NotificationService');

const employee = {
  employee_id: 'emp001',
  name: '张三',
  dingtalk_user_id: 'user123',  // 钉钉用户ID
  email: 'zhangsan@example.com',
  entry_date: '2025-01-15'
};

const formUrl = 'https://yourcompany.com/onboarding/abc123';

await notificationService.sendOnboardingNotification(employee, formUrl);
```

#### 示例 2: 发送入职前提醒

```javascript
await notificationService.sendPreOnboardingReminder(employee, 3); // 3天前提醒
```

#### 示例 3: 发送批量通知

```javascript
const employees = [
  { employee_id: 'emp001', name: '张三', dingtalk_user_id: 'user1', email: 'user1@example.com' },
  { employee_id: 'emp002', name: '李四', dingtalk_user_id: 'user2', email: 'user2@example.com' },
];

const result = await notificationService.sendBatchNotification(
  employees,
  '月度会议通知',
  '请大家准时参加本月的全员大会。',
  { type: 'text' }
);

console.log(`成功: ${result.success}/${result.total}`);
```

### 手动触发定时任务

在需要测试时，可以手动触发定时任务：

```javascript
const schedulerService = require('./services/SchedulerService');

// 手动触发入职流程任务
await schedulerService.runTask('onboarding');

// 手动触发入职前提醒
await schedulerService.runTask('pre-onboarding');

// 手动触发欢迎消息
await schedulerService.runTask('welcome');

// 手动触发合同到期提醒
await schedulerService.runTask('contract-expiry');

// 手动触发月度统计
await schedulerService.runTask('statistics');
```

---

## 定时任务说明

### 自动化任务时间表

| 任务名称 | 执行时间 | 功能描述 |
|---------|---------|---------|
| 入职当天推送 | 每日 9:00 AM | 向当天入职的员工发送入职登记表链接 |
| 入职前提醒 | 每日 10:00 AM | 向3天后入职的员工发送准备提醒 |
| 欢迎消息 | 每周一 9:00 AM | 向入职满一周的员工发送欢迎消息 |
| 培训提醒 | 每日 8:00 AM | 发送培训日程提醒（需要培训数据） |
| 合同到期提醒 | 每日 9:00 AM | 向30天内合同到期的员工发送提醒 |
| 月度统计推送 | 每月1日 10:00 AM | 发送上月出差补助、食堂工资统计 |

### 启用/禁用调度器

#### 方法 1: 环境变量

```bash
# 启用
ENABLE_SCHEDULER=true

# 禁用
ENABLE_SCHEDULER=false
```

#### 方法 2: 代码控制

```javascript
const schedulerService = require('./services/SchedulerService');

// 启动调度器
schedulerService.start();

// 停止调度器
schedulerService.stop();

// 查看状态
const status = schedulerService.getStatus();
console.log(status);
// 输出:
// {
//   isRunning: true,
//   jobCount: 6,
//   notificationChannels: {
//     dingtalk: true,
//     email: true
//   }
// }
```

---

## 故障排查

### 问题 1: 钉钉通知发送失败

**症状**: 日志显示 "Failed to send work notification"

**解决方法**:
1. 检查钉钉凭证是否正确
2. 确认应用已开启"发送工作通知"权限
3. 验证 `dingtalk_user_id` 是否正确
4. 查看详细错误日志 (`LOG_LEVEL=DEBUG`)

```bash
# 查看日志
tail -f logs/app.log | grep DingTalk
```

### 问题 2: 邮件通知发送失败

**症状**: 日志显示 "Email notification failed"

**解决方法**:
1. 检查SMTP配置是否正确
2. 如果使用Gmail，需要启用"应用专用密码"
3. 确认端口和加密设置正确（587端口通常需要 `SMTP_SECURE=false`）

### 问题 3: Access Token 获取失败

**症状**: "Failed to get DingTalk access token"

**解决方法**:
1. 验证 `DINGTALK_APP_KEY` 和 `DINGTALK_APP_SECRET` 是否正确
2. 检查网络连接
3. 确认钉钉应用状态正常

### 问题 4: 定时任务未执行

**症状**: 定时任务到时间未触发

**解决方法**:
1. 确认 `ENABLE_SCHEDULER=true`
2. 检查服务器时区设置
3. 查看调度器日志

```javascript
// 检查调度器状态
const status = schedulerService.getStatus();
console.log('Scheduler running:', status.isRunning);
console.log('Active jobs:', status.jobCount);
```

---

## API 参考

### DingTalkService

#### `getAccessToken(): Promise<string>`
获取钉钉Access Token（自动缓存）

```javascript
const token = await dingTalkService.getAccessToken();
```

#### `sendTextMessage(userIdList: string[], content: string): Promise<Object>`
发送文本消息

```javascript
await dingTalkService.sendTextMessage(['user1', 'user2'], '这是一条文本消息');
```

#### `sendMarkdownMessage(userIdList: string[], title: string, text: string): Promise<Object>`
发送Markdown消息

```javascript
await dingTalkService.sendMarkdownMessage(
  ['user1'],
  '重要通知',
  '# 标题\n这是**粗体**内容'
);
```

#### `getUserIdByMobile(mobile: string): Promise<string|null>`
根据手机号获取钉钉用户ID

```javascript
const userId = await dingTalkService.getUserIdByMobile('13800138000');
```

### NotificationService

#### `sendNotification(options): Promise<Object>`
发送通知（自动选择渠道）

```javascript
const result = await notificationService.sendNotification({
  employee: employeeObject,
  title: '通知标题',
  content: '通知内容',
  type: 'text', // 'text' | 'markdown' | 'link' | 'oa'
  extra: { url: 'https://example.com' },
  emailFallback: true
});
```

#### `sendBatchNotification(employees, title, content, options): Promise<Object>`
批量发送通知

```javascript
const result = await notificationService.sendBatchNotification(
  employees,
  '标题',
  '内容',
  { type: 'text' }
);

console.log(`成功: ${result.success}, 失败: ${result.failed}`);
```

#### `getAvailability(): Object`
检查可用的通知渠道

```javascript
const channels = notificationService.getAvailability();
// { dingtalk: true, email: true }
```

### SchedulerService

#### `start(): void`
启动调度器

```javascript
schedulerService.start();
```

#### `stop(): void`
停止调度器

```javascript
schedulerService.stop();
```

#### `runTask(taskName: string): Promise<void>`
手动运行指定任务

```javascript
await schedulerService.runTask('onboarding');
```

可用任务名称:
- `onboarding` - 入职流程
- `pre-onboarding` - 入职前提醒
- `welcome` - 欢迎消息
- `training` - 培训提醒
- `contract-expiry` - 合同到期提醒
- `statistics` - 月度统计

#### `getStatus(): Object`
获取调度器状态

```javascript
const status = schedulerService.getStatus();
```

---

## 最佳实践

### 1. 通知发送时机

- ✅ **入职前3天**: 发送准备材料提醒
- ✅ **入职当天**: 发送入职登记表链接
- ✅ **入职一周后**: 发送欢迎消息
- ✅ **合同到期前30天**: 发送续签提醒
- ✅ **每月1日**: 发送上月统计数据

### 2. 错误处理

始终检查通知发送结果:

```javascript
const result = await notificationService.sendNotification(...);
if (!result.success) {
  // 记录失败，通知HR
  logger.error(`通知发送失败: ${result.error}`);
  // 可选: 发送邮件给HR
}
```

### 3. 批量操作

发送大量通知时使用批量接口:

```javascript
// ✅ 好的做法
const result = await notificationService.sendBatchNotification(employees, ...);

// ❌ 避免
for (const employee of employees) {
  await notificationService.sendNotification(...);
}
```

### 4. 测试环境

在生产环境前，先在测试环境验证:

```bash
# 设置测试环境
ENABLE_SCHEDULER=false  # 手动控制
LOG_LEVEL=DEBUG        # 详细日志

# 手动触发任务进行测试
await schedulerService.runTask('onboarding');
```

---

## 更新日志

### 2025-12-02
- ✨ 初始版本发布
- ✨ 钉钉API集成完成
- ✨ 通知服务实现
- ✨ 定时任务调度系统上线
- ✅ 20+单元测试全部通过

---

## 技术支持

如遇问题，请：
1. 查看日志文件 (`logs/app.log`)
2. 参考本文档的故障排查部分
3. 联系开发团队

**相关文档**:
- [CLAUDE.md](../CLAUDE.md) - 开发指南
- [requirement.md](../requirement.md) - 项目需求文档
- [README.md](../README.md) - 项目概述
