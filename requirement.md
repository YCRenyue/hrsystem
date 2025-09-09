# 员工信息录入和登入功能详细需求

## 一、项目架构设计

### 1.1 技术栈选择

- **前端**：React + Ant Design / Vue.js + Element UI
- **后端**：Node.js/Express 或 Java/Spring Boot
- **数据库**：MySQL 8.0+
- **文件处理**：SheetJS (xlsx解析)
- **钉钉集成**：钉钉开放平台API
- **部署**：Docker + 云服务器

### 1.2 项目结构

```
hrsystem/
├── frontend/          # 前端代码
├── backend/          # 后端代码
├── database/         # 数据库脚本
├── docs/            # 文档
└── deploy/          # 部署配置
```

## 二、功能点分解和实现步骤

### 阶段一：基础环境搭建（估时：2-3天）

#### 1.1 项目初始化

- [ ] 创建前端项目架构
- [ ] 创建后端项目架构
- [ ] 配置开发环境
- [ ] 设置Git工作流

#### 1.2 数据库设计和初始化

- [ ] 设计员工表结构
- [ ] 设计部门表结构
- [ ] 设计用户权限表结构
- [ ] 创建数据库初始化脚本
- [ ] 设置数据库连接池

#### 1.3 钉钉开发环境配置

- [ ] 注册钉钉开发者账号
- [ ] 创建企业内部应用
- [ ] 获取AppKey和AppSecret
- [ ] 配置回调地址

### 阶段二：员工信息数据模型（估时：1-2天）

#### 2.1 数据库表创建

- [ ] 创建员工信息表(employees)

  - employee_id (主键)
  - sequence_number (序号)
  - company_number (公司编号/工号，唯一)
  - name (姓名)
  - id_card_encrypted (身份证号码，AES加密)
  - birth_date (出生日期)
  - gender (性别)
  - age (年龄，计算字段)
  - phone (联系电话)
  - email (邮箱)
  - hire_date (入职时间)
  - probation_end_date (转正日期)
  - department_id (部门ID)
  - position (岗位)
  - work_years (工龄，计算字段)
  - status (状态: pending/completed/probation/active/inactive)
  - remarks (备注)
  - contract_end_date (合同到期日)
  - id_card_file_path (身份证复印件文件路径)
  - insurance_company (保险所在公司)
  - dingtalk_user_id (钉钉用户ID)
  - data_complete (数据完整性: true/false)
  - created_by (创建人HR的ID)
  - created_at, updated_at
- [ ] 创建入职流程表(onboarding_process)

  - process_id (主键)
  - employee_id (员工ID，外键)
  - process_status (流程状态: pending/sent/completed/timeout)
  - notification_method (推送方式: dingtalk/sms/wechat_manual)
  - sent_time (推送时间)
  - completed_time (完成时间)
  - form_token (登记表访问token)
  - form_link (登记表链接)
  - reminder_count (提醒次数)
  - created_at, updated_at

- [ ] 创建权限管理表(user_permissions)

  - permission_id (主键)
  - user_id (用户ID)
  - user_type (用户类型: admin/hr/employee)
  - department_scope (部门权限范围)
  - function_permissions (功能权限JSON)
  - created_at, updated_at

- [ ] 创建数据加密配置表(encryption_config)

  - config_id (主键)
  - field_name (字段名称)
  - encryption_method (加密方法)
  - is_active (是否启用)
  - created_at, updated_at
- [ ] 创建部门表(departments)

  - department_id (主键)
  - department_name (部门名称)
  - parent_department_id (上级部门)
  - manager_id (部门负责人)
  - created_at, updated_at
- [ ] 创建操作日志表(operation_logs)

  - log_id (主键)
  - user_id (操作用户ID)
  - operation_type (操作类型)
  - table_name (操作表名)
  - record_id (操作记录ID)
  - old_values (修改前数据JSON)
  - new_values (修改后数据JSON)
  - ip_address (操作IP)
  - created_at

#### 2.2 数据模型开发

- [ ] 创建Employee模型类
- [ ] 创建OnboardingProcess模型类
- [ ] 创建Department模型类
- [ ] 创建UserPermission模型类
- [ ] 创建OperationLog模型类
- [ ] 实现基础CRUD操作
- [ ] 实现员工状态流转逻辑
- [ ] 实现数据加密/解密方法
- [ ] 实现权限验证逻辑

### 阶段三：数据安全和权限系统（估时：2-3天）

#### 3.1 数据加密系统
- [ ] 实现AES-256加密工具类
- [ ] 配置敏感字段加密规则
- [ ] 实现身份证号码加密存储
- [ ] 实现联系电话脱敏显示
- [ ] 实现数据加密中间件
- [ ] 设置加密密钥管理

#### 3.2 三级权限系统
- [ ] 设计权限模型和角色定义
- [ ] 实现用户角色分配功能
- [ ] 实现权限验证中间件
- [ ] 实现数据权限过滤
- [ ] 设置管理员权限管理界面
- [ ] 实现权限继承和覆盖逻辑

#### 3.3 操作审计系统
- [ ] 实现操作日志记录
- [ ] 设计敏感操作拦截
- [ ] 实现数据变更追踪
- [ ] 设置日志查询和分析
- [ ] 实现异常操作告警
- [ ] 配置日志清理策略

### 阶段四：钉钉集成基础功能（估时：2-3天）

#### 4.1 钉钉API封装

- [ ] 实现获取access_token功能
- [ ] 实现用户信息获取API
- [ ] 实现组织架构获取API
- [ ] 实现OAuth认证功能
- [ ] 错误处理和重试机制

#### 4.2 用户认证系统

- [ ] 实现钉钉OAuth登录流程
- [ ] 实现JWT token生成和验证
- [ ] 实现会话管理
- [ ] 实现权限中间件

### 阶段五：Excel文件导入功能（估时：3-4天）

#### 5.1 文件上传功能

- [ ] 前端文件上传组件
- [ ] 后端文件接收和存储
- [ ] 文件格式验证(.xlsx, .xls)
- [ ] 文件大小限制(10MB)

#### 5.2 Excel解析功能

- [ ] 安装和配置SheetJS库
- [ ] 实现Excel文件读取
- [ ] 实现数据格式验证
- [ ] 实现必填字段检查
- [ ] 实现数据类型转换

#### 5.3 数据验证和清洗

- [ ] 手机号格式验证
- [ ] 邮箱格式验证
- [ ] 姓名重复性检查
- [ ] 部门存在性验证
- [ ] 钉钉用户ID验证

#### 5.4 批量导入处理

- [ ] 实现事务处理
- [ ] 实现错误数据收集
- [ ] 实现导入进度显示
- [ ] 实现导入结果报告
- [ ] 实现失败数据导出

#### 5.5 钉钉账号绑定

- [ ] 根据手机号匹配钉钉用户
- [ ] 实现自动绑定功能
- [ ] 处理绑定失败情况
- [ ] 生成绑定结果报告

### 阶段六：入职流程自动化功能（估时：3-4天）

#### 6.1 HR员工预录入功能

- [ ] 设计HR员工预录入表单
  - 员工姓名输入
  - 工号生成/输入
  - 入职日期选择
  - 部门选择
  - 基础职位信息
- [ ] 实现员工基础信息保存
- [ ] 实现工号唯一性验证
- [ ] 实现入职流程自动创建
- [ ] 员工状态设置为"待完善"

#### 5.2 定时任务系统

- [ ] 安装和配置任务调度器(node-cron/spring-scheduler)
- [ ] 实现入职日期监控任务
- [ ] 实现每日任务执行逻辑
- [ ] 实现任务执行日志记录
- [ ] 实现任务失败重试机制

#### 5.3 入职登记表动态生成

- [ ] 设计完整的入职登记表单
- [ ] 实现表单动态链接生成
- [ ] 实现表单访问权限控制
- [ ] 实现表单有效期管理
- [ ] 实现表单提交数据合并

#### 6.4 多渠道消息推送功能

- [ ] 实现钉钉工作通知发送（主要方式）
- [ ] 集成短信API发送链接（备用方式）
- [ ] 设计入职登记表推送消息模板
- [ ] 实现推送方式优先级策略
- [ ] 实现消息发送状态跟踪
- [ ] 实现发送失败自动切换渠道
- [ ] 实现HR手动推送通知功能
- [ ] 实现消息发送日志记录

#### 6.5 员工自主信息完善

- [ ] 设计员工信息完善表单（基于Excel模板）
- [ ] 实现用户登录验证（钉钉账号）
- [ ] 实现表单预填充（HR录入的基础信息）
- [ ] 实现敏感信息加密提交
- [ ] 实现表单数据验证和文件上传
- [ ] 实现信息提交和数据合并
- [ ] 实现完成状态自动更新
- [ ] 实现表单访问权限控制（只能填写自己的信息）

### 阶段七：HR兜底录入功能（估时：2天）

#### 7.1 完整员工信息录入

- [ ] 设计完整的员工信息录入表单
- [ ] 实现所有字段的数据验证
- [ ] 实现钉钉账号手动绑定
- [ ] 实现直接状态设置为"已完善"
- [ ] 实现操作权限控制

#### 7.2 批量操作和管理

- [ ] 实现待完善员工列表显示
- [ ] 实现批量提醒功能
- [ ] 实现超时员工标记
- [ ] 实现手动完善操作
- [ ] 实现状态批量更新

### 阶段八：员工登入功能（估时：2天）

#### 8.1 登录页面开发

- [ ] 设计钉钉登录页面
- [ ] 实现钉钉扫码登录
- [ ] 实现移动端适配
- [ ] 实现登录状态保持

#### 8.2 个人信息页面

- [ ] 设计个人信息展示页面
- [ ] 实现部门信息显示
- [ ] 实现个人信息编辑(限制字段)
- [ ] 实现密码修改功能

#### 8.3 权限控制

- [ ] 实现基于角色的路由守卫
- [ ] 实现API权限控制
- [ ] 实现数据权限过滤
- [ ] 实现操作日志记录

### 阶段九：HR管理界面（估时：2-3天）

#### 9.1 员工列表管理（HR专用）

- [ ] 实现员工信息列表展示
- [ ] 实现多维度搜索和筛选功能
  - 按姓名、工号、部门搜索
  - 按员工状态筛选
  - 按入职时间范围筛选
- [ ] 实现分页和排序功能
- [ ] 实现员工信息查看和编辑权限
- [ ] 实现员工状态管理
- [ ] 实现入职流程状态查看
- [ ] 实现敏感信息权限控制展示
- [ ] 实现批量操作权限控制

#### 9.2 入职流程管理

- [ ] 实现入职流程列表展示
- [ ] 实现流程状态监控
- [ ] 实现手动重发登记表功能
- [ ] 实现流程超时处理
- [ ] 实现批量提醒功能

#### 9.3 批量操作功能

- [ ] 实现批量选择
- [ ] 实现批量删除
- [ ] 实现批量状态更新
- [ ] 实现数据导出功能
- [ ] 实现批量消息推送

#### 9.4 部门管理

- [ ] 实现部门树形结构显示
- [ ] 实现部门增删改操作
- [ ] 实现部门员工分配
- [ ] 实现部门负责人设置

### 阶段十：测试和优化（估时：2天）

#### 10.1 功能测试

- [ ] 单元测试编写
- [ ] 集成测试
- [ ] 用户体验测试
- [ ] 性能测试

#### 10.2 优化和修复

- [ ] 性能优化
- [ ] Bug修复
- [ ] 安全加固
- [ ] 文档完善

## 三、关键技术实现要点

### 3.1 入职流程核心逻辑

```javascript
// 预期实现结构
const createEmployeeBasicInfo = async (employeeData) => {
  // 1. 创建员工基础记录
  // 2. 生成唯一工号
  // 3. 创建入职流程记录
  // 4. 设置状态为"待完善"
}

const dailyOnboardingTask = async () => {
  // 1. 查询当日入职员工
  // 2. 生成入职登记表链接
  // 3. 推送钉钉消息
  // 4. 更新流程状态
}
```

### 3.2 动态表单生成

```javascript
// 预期实现结构
const generateOnboardingForm = async (employeeId) => {
  // 1. 生成唯一表单ID
  // 2. 预填充基础信息
  // 3. 设置表单有效期
  // 4. 返回访问链接
}
```

### 3.3 钉钉消息推送结构

```javascript
// 预期实现结构
const sendOnboardingNotification = async (employeeInfo) => {
  // 1. 构建消息模板
  // 2. 发送工作通知
  // 3. 记录发送状态
  // 4. 设置重试机制
}
```

### 3.4 Excel解析核心代码结构

```javascript
// 预期实现结构
const parseExcelFile = async (filePath) => {
  // 1. 读取Excel文件
  // 2. 验证数据格式
  // 3. 清洗和转换数据
  // 4. 返回解析结果
}
```

### 3.5 钉钉API集成要点

```javascript
// 预期实现结构
const DingTalkAPI = {
  getAccessToken: async () => {},
  getUserInfo: async (code) => {},
  getDepartments: async () => {},
  bindUser: async (userId, employeeId) => {},
  sendWorkNotification: async (userId, message) => {}
}
```

### 3.6 数据加密核心实现
```javascript
// 预期实现结构
const EncryptionService = {
  encryptSensitiveData: async (data, fieldName) => {
    // AES-256加密敏感数据
  },
  decryptSensitiveData: async (encryptedData, fieldName) => {
    // 解密敏感数据
  },
  maskPhoneNumber: (phone) => {
    // 手机号脱敏显示
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }
}
```

### 3.7 权限验证中间件
```javascript
// 预期实现结构
const PermissionMiddleware = {
  checkUserRole: (requiredRole) => {
    return async (req, res, next) => {
      // 验证用户角色权限
    }
  },
  checkDataAccess: (resourceType) => {
    return async (req, res, next) => {
      // 验证数据访问权限
    }
  },
  logOperation: async (userId, operation, data) => {
    // 记录操作日志
  }
}
```

### 3.8 多渠道消息推送
```javascript
// 预期实现结构
const NotificationService = {
  sendDingTalkMessage: async (userId, message) => {
    // 钉钉消息推送
  },
  sendSMSMessage: async (phone, message) => {
    // 短信推送
  },
  sendWithFallback: async (employee, message) => {
    // 多渠道推送，失败自动切换
  }
}
```

## 四、部署和上线计划

### 4.1 开发环境部署

- [ ] 设置开发环境Docker配置
- [ ] 配置开发数据库
- [ ] 设置热重载和调试

### 4.2 测试环境部署

- [ ] 设置测试环境
- [ ] 配置CI/CD流程
- [ ] 自动化测试集成

### 4.3 生产环境部署

- [ ] 云服务器配置
- [ ] 域名和SSL证书配置
- [ ] 数据库备份策略
- [ ] 监控和日志系统

## 五、风险评估和应对

### 5.1 技术风险

- **钉钉API限流**：实现请求缓存和重试机制
- **大文件处理**：实现分批处理和进度显示
- **数据安全**：实现数据加密和访问控制

### 5.2 业务风险

- **数据准确性**：多层数据验证
- **用户体验**：充分的测试和反馈收集
- **系统稳定性**：完善的错误处理和恢复机制

## 六、成功标准

### 6.1 功能性指标
- [ ] HR预录入成功率 > 98%
- [ ] 入职登记表推送成功率 > 95%
- [ ] 员工自主完善率 > 85%
- [ ] Excel导入成功率 > 95%
- [ ] 钉钉账号绑定成功率 > 90%
- [ ] 多渠道推送切换成功率 > 98%
- [ ] 定时任务执行准确率 > 99%

### 6.2 安全性指标
- [ ] 敏感数据加密率 100%
- [ ] 权限验证覆盖率 100%
- [ ] 零SQL注入漏洞
- [ ] 零敏感信息泄露
- [ ] 操作审计日志完整性 100%

### 6.3 性能指标
- [ ] 系统响应时间 < 2秒
- [ ] 大文件上传处理时间 < 30秒
- [ ] 并发用户支持 > 100人
- [ ] 数据库查询优化 > 95%

### 6.4 用户体验指标
- [ ] 用户满意度 > 90%
- [ ] 界面易用性评分 > 4.5/5
- [ ] 移动端适配完成度 100%
- [ ] 错误提示友好度 > 95%
