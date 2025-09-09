# API接口文档

## 1. 接口规范

### 1.1 基础信息
- **Base URL**: `https://api.hrsystem.com/v1`
- **协议**: HTTPS
- **数据格式**: JSON
- **字符编码**: UTF-8
- **认证方式**: Bearer Token (JWT)

### 1.2 通用响应格式
```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": "2025-09-09T10:30:00Z",
  "requestId": "uuid-string"
}
```

### 1.3 状态码说明
| 状态码 | 含义 | 说明 |
|-------|------|------|
| 200 | 成功 | 请求成功 |
| 400 | 请求错误 | 参数错误或格式不正确 |
| 401 | 未认证 | Token无效或已过期 |
| 403 | 无权限 | 没有访问权限 |
| 404 | 不存在 | 资源不存在 |
| 500 | 服务器错误 | 内部服务器错误 |

## 2. 认证接口

### 2.1 钉钉OAuth登录
```http
POST /auth/dingtalk/login
```

**请求参数**：
```json
{
  "authCode": "钉钉授权码",
  "state": "状态参数"
}
```

**响应示例**：
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "jwt-token-string",
    "refreshToken": "refresh-token-string",
    "expiresIn": 7200,
    "userInfo": {
      "userId": "user123",
      "name": "张三",
      "avatar": "头像URL",
      "role": "employee",
      "permissions": ["read:profile", "write:profile"]
    }
  }
}
```

### 2.2 刷新Token
```http
POST /auth/refresh
```

**请求参数**：
```json
{
  "refreshToken": "refresh-token-string"
}
```

### 2.3 退出登录
```http
POST /auth/logout
```

**请求头**：
```
Authorization: Bearer jwt-token-string
```

## 3. 用户管理接口

### 3.1 获取当前用户信息
```http
GET /users/profile
```

**响应示例**：
```json
{
  "code": 200,
  "data": {
    "userId": "user123",
    "employeeId": "EMP001",
    "name": "张三",
    "phone": "138****5678",
    "email": "zhangsan@company.com",
    "department": "技术部",
    "position": "软件工程师",
    "hireDate": "2023-01-15",
    "status": "active"
  }
}
```

### 3.2 更新用户信息
```http
PUT /users/profile
```

**请求参数**：
```json
{
  "phone": "13888888888",
  "email": "newemail@company.com",
  "emergencyContact": "李四",
  "emergencyPhone": "13999999999"
}
```

## 4. 员工管理接口

### 4.1 获取员工列表 (HR权限)
```http
GET /employees?page=1&size=10&department=技术部&status=active
```

**查询参数**：
- `page`: 页码，默认1
- `size`: 每页数量，默认10
- `department`: 部门筛选
- `status`: 状态筛选
- `keyword`: 搜索关键词

**响应示例**：
```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "employeeId": "EMP001",
        "name": "张三",
        "phone": "138****5678",
        "department": "技术部",
        "position": "软件工程师",
        "hireDate": "2023-01-15",
        "status": "active"
      }
    ],
    "total": 100,
    "page": 1,
    "size": 10
  }
}
```

### 4.2 创建员工 (HR权限)
```http
POST /employees
```

**请求参数**：
```json
{
  "name": "李四",
  "employeeNumber": "EMP002",
  "phone": "13999999999",
  "email": "lisi@company.com",
  "departmentId": "DEPT001",
  "position": "产品经理",
  "hireDate": "2025-09-10",
  "idCard": "加密身份证号",
  "birthDate": "1990-05-15",
  "gender": "male"
}
```

### 4.3 更新员工信息 (HR权限)
```http
PUT /employees/{employeeId}
```

### 4.4 删除员工 (HR权限)
```http
DELETE /employees/{employeeId}
```

### 4.5 Excel批量导入 (HR权限)
```http
POST /employees/import
Content-Type: multipart/form-data
```

**请求参数**：
- `file`: Excel文件

**响应示例**：
```json
{
  "code": 200,
  "data": {
    "totalCount": 100,
    "successCount": 95,
    "failCount": 5,
    "failList": [
      {
        "row": 6,
        "name": "王五",
        "error": "身份证号格式不正确"
      }
    ]
  }
}
```

## 5. 入职流程接口

### 5.1 HR预录入员工
```http
POST /onboarding/pre-register
```

**请求参数**：
```json
{
  "name": "新员工姓名",
  "employeeNumber": "EMP003",
  "hireDate": "2025-09-15",
  "departmentId": "DEPT001",
  "position": "Java开发工程师"
}
```

### 5.2 获取入职登记表
```http
GET /onboarding/form/{token}
```

**响应示例**：
```json
{
  "code": 200,
  "data": {
    "employeeInfo": {
      "name": "新员工姓名",
      "employeeNumber": "EMP003",
      "department": "技术部",
      "position": "Java开发工程师"
    },
    "formFields": [
      {
        "field": "phone",
        "label": "手机号码",
        "type": "text",
        "required": true
      },
      {
        "field": "idCard",
        "label": "身份证号",
        "type": "text",
        "required": true
      }
    ]
  }
}
```

### 5.3 提交入职登记表
```http
POST /onboarding/form/{token}
```

**请求参数**：
```json
{
  "phone": "13888888888",
  "email": "newemployee@company.com",
  "idCard": "身份证号",
  "birthDate": "1995-06-20",
  "gender": "female",
  "address": "详细地址",
  "emergencyContact": "紧急联系人",
  "emergencyPhone": "紧急联系电话"
}
```

### 5.4 获取入职流程状态 (HR权限)
```http
GET /onboarding/processes?status=pending&page=1&size=10
```

## 6. 部门管理接口

### 6.1 获取部门树
```http
GET /departments/tree
```

**响应示例**：
```json
{
  "code": 200,
  "data": [
    {
      "departmentId": "DEPT001",
      "name": "技术部",
      "parentId": null,
      "managerId": "EMP001",
      "children": [
        {
          "departmentId": "DEPT002",
          "name": "前端组",
          "parentId": "DEPT001",
          "managerId": "EMP002",
          "children": []
        }
      ]
    }
  ]
}
```

### 6.2 创建部门 (管理员权限)
```http
POST /departments
```

### 6.3 更新部门 (管理员权限)
```http
PUT /departments/{departmentId}
```

### 6.4 删除部门 (管理员权限)
```http
DELETE /departments/{departmentId}
```

## 7. 智能问答接口

### 7.1 文字问答
```http
POST /ai/chat
```

**请求参数**：
```json
{
  "message": "请问年假怎么申请？",
  "sessionId": "session123"
}
```

**响应示例**：
```json
{
  "code": 200,
  "data": {
    "reply": "年假申请流程：1. 在系统中提交申请... 2. 部门主管审批... 3. HR确认...",
    "sessionId": "session123",
    "suggestions": [
      "如何查看年假余额？",
      "年假申请需要提前几天？"
    ]
  }
}
```

### 7.2 语音问答
```http
POST /ai/voice-chat
Content-Type: multipart/form-data
```

**请求参数**：
- `audio`: 语音文件 (mp3/wav)
- `sessionId`: 会话ID

## 8. 消息推送接口

### 8.1 发送钉钉消息 (HR权限)
```http
POST /notifications/dingtalk
```

**请求参数**：
```json
{
  "userIds": ["user123", "user456"],
  "messageType": "text",
  "content": {
    "text": "消息内容"
  }
}
```

### 8.2 发送入职登记表链接
```http
POST /notifications/onboarding-form
```

**请求参数**：
```json
{
  "employeeId": "EMP003",
  "method": "dingtalk" // dingtalk/sms/manual
}
```

## 9. 文件管理接口

### 9.1 文件上传
```http
POST /files/upload
Content-Type: multipart/form-data
```

**请求参数**：
- `file`: 文件
- `type`: 文件类型 (avatar/idcard/contract)

**响应示例**：
```json
{
  "code": 200,
  "data": {
    "fileId": "file123",
    "fileName": "身份证.jpg",
    "fileUrl": "https://cdn.example.com/files/file123.jpg",
    "fileSize": 204800
  }
}
```

### 9.2 文件下载
```http
GET /files/download/{fileId}
```

## 10. 报表接口

### 10.1 员工统计报表 (HR权限)
```http
GET /reports/employee-statistics
```

**查询参数**：
- `startDate`: 开始日期
- `endDate`: 结束日期
- `departmentId`: 部门ID

**响应示例**：
```json
{
  "code": 200,
  "data": {
    "totalEmployees": 150,
    "newHires": 10,
    "departures": 2,
    "departmentStats": [
      {
        "departmentName": "技术部",
        "employeeCount": 50,
        "newHires": 5
      }
    ]
  }
}
```

### 10.2 入职流程报表 (HR权限)
```http
GET /reports/onboarding-statistics
```

## 11. 错误码说明

| 错误码 | 含义 | 处理建议 |
|-------|------|----------|
| 10001 | 参数缺失 | 检查必填参数 |
| 10002 | 参数格式错误 | 检查参数格式 |
| 20001 | 用户不存在 | 检查用户ID |
| 20002 | 密码错误 | 重新输入密码 |
| 30001 | 权限不足 | 联系管理员授权 |
| 40001 | 员工不存在 | 检查员工ID |
| 40002 | 部门不存在 | 检查部门ID |
| 50001 | 文件上传失败 | 检查文件格式和大小 |
| 60001 | 钉钉API调用失败 | 检查钉钉配置 |

## 12. SDK和示例

### 12.1 JavaScript SDK
```javascript
import HRSystemAPI from 'hrsystem-api-sdk';

const api = new HRSystemAPI({
  baseURL: 'https://api.hrsystem.com/v1',
  token: 'your-jwt-token'
});

// 获取员工列表
const employees = await api.employees.list({
  page: 1,
  size: 10
});

// 创建员工
const newEmployee = await api.employees.create({
  name: '张三',
  phone: '13888888888'
});
```

### 12.2 Python SDK
```python
from hrsystem_api import HRSystemAPI

api = HRSystemAPI(
    base_url='https://api.hrsystem.com/v1',
    token='your-jwt-token'
)

# 获取员工列表
employees = api.employees.list(page=1, size=10)

# 创建员工
new_employee = api.employees.create({
    'name': '张三',
    'phone': '13888888888'
})
```
