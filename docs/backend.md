# 后端开发指南

## 1. 技术栈

### 1.1 核心框架
- **Node.js 18.x**: JavaScript运行环境
- **Express 4.x**: Web应用框架
- **TypeScript 5.x**: 类型安全的JavaScript
- **MySQL 8.0**: 关系型数据库
- **Redis 6.x**: 内存数据库

### 1.2 ORM和数据库
- **TypeORM**: TypeScript ORM框架
- **MySQL2**: MySQL驱动
- **Redis**: 缓存和会话存储
- **ioredis**: Redis客户端

### 1.3 认证和安全
- **jsonwebtoken**: JWT Token生成
- **bcryptjs**: 密码加密
- **helmet**: 安全头设置
- **cors**: 跨域资源共享
- **crypto**: 数据加密

### 1.4 工具库
- **joi**: 数据验证
- **multer**: 文件上传
- **nodemailer**: 邮件发送
- **node-cron**: 定时任务
- **winston**: 日志记录

## 2. 项目结构

```
backend/
├── src/
│   ├── controllers/        # 控制器
│   │   ├── auth.controller.ts
│   │   ├── employee.controller.ts
│   │   ├── onboarding.controller.ts
│   │   └── report.controller.ts
│   ├── services/           # 业务逻辑层
│   │   ├── auth.service.ts
│   │   ├── employee.service.ts
│   │   ├── dingtalk.service.ts
│   │   └── notification.service.ts
│   ├── models/            # 数据模型
│   │   ├── entities/      # 实体定义
│   │   ├── dto/           # 数据传输对象
│   │   └── repositories/  # 数据访问层
│   ├── middleware/        # 中间件
│   │   ├── auth.middleware.ts
│   │   ├── permission.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── error.middleware.ts
│   ├── routes/            # 路由定义
│   │   ├── auth.routes.ts
│   │   ├── employee.routes.ts
│   │   └── index.ts
│   ├── utils/             # 工具函数
│   │   ├── encryption.util.ts
│   │   ├── jwt.util.ts
│   │   ├── logger.util.ts
│   │   └── validator.util.ts
│   ├── config/            # 配置文件
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   └── app.config.ts
│   ├── types/             # 类型定义
│   ├── jobs/              # 定时任务
│   └── app.ts             # 应用入口
├── tests/                 # 测试文件
├── docker/               # Docker配置
├── migrations/           # 数据库迁移
├── package.json
├── tsconfig.json
└── .env.example
```

## 3. 环境搭建

### 3.1 环境要求
- Node.js >= 18.0.0
- MySQL >= 8.0
- Redis >= 6.0
- npm >= 8.0.0

### 3.2 项目初始化
```bash
# 创建项目目录
mkdir hrsystem-backend
cd hrsystem-backend

# 初始化项目
npm init -y

# 安装核心依赖
npm install express typescript ts-node
npm install mysql2 typeorm reflect-metadata
npm install redis ioredis
npm install jsonwebtoken bcryptjs
npm install joi multer cors helmet

# 安装开发依赖
npm install -D @types/node @types/express @types/cors
npm install -D @types/jsonwebtoken @types/bcryptjs
npm install -D nodemon jest @types/jest ts-jest
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### 3.3 配置文件

#### TypeScript配置 (tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### 环境变量 (.env.example)
```env
# 服务器配置
PORT=8080
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_DATABASE=hrsystem

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# 钉钉配置
DINGTALK_APP_KEY=your-app-key
DINGTALK_APP_SECRET=your-app-secret

# 加密配置
ENCRYPTION_KEY=your-encryption-key

# 文件存储
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
```

## 4. 数据库设计

### 4.1 实体定义
```typescript
// src/models/entities/Employee.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Department } from './Department.entity';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  employeeId: string;

  @Column({ unique: true })
  employeeNumber: string;

  @Column()
  name: string;

  @Column({ type: 'text', comment: '加密存储的身份证号' })
  idCardEncrypted: string;

  @Column({ type: 'date' })
  birthDate: Date;

  @Column({ type: 'enum', enum: ['male', 'female'] })
  gender: string;

  @Column()
  phone: string;

  @Column()
  email: string;

  @Column({ type: 'date' })
  hireDate: Date;

  @Column({ type: 'date', nullable: true })
  probationEndDate?: Date;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'departmentId' })
  department: Department;

  @Column()
  position: string;

  @Column({ type: 'enum', enum: ['pending', 'completed', 'probation', 'active', 'inactive'], default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  @Column({ type: 'date', nullable: true })
  contractEndDate?: Date;

  @Column({ nullable: true })
  idCardFilePath?: string;

  @Column({ nullable: true })
  insuranceCompany?: string;

  @Column({ nullable: true })
  dingtalkUserId?: string;

  @Column({ type: 'boolean', default: false })
  dataComplete: boolean;

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 4.2 数据库连接
```typescript
// src/config/database.config.ts
import { DataSource } from 'typeorm';
import { Employee } from '@/models/entities/Employee.entity';
import { Department } from '@/models/entities/Department.entity';
import { OnboardingProcess } from '@/models/entities/OnboardingProcess.entity';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: [Employee, Department, OnboardingProcess],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
});
```

## 5. 核心功能实现

### 5.1 认证中间件
```typescript
// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@/utils/jwt.util';
import { AppDataSource } from '@/config/database.config';
import { User } from '@/models/entities/User.entity';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    permissions: string[];
  };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        code: 401,
        message: '未提供认证token'
      });
    }

    const decoded = verifyToken(token);
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { userId: decoded.userId },
      relations: ['permissions']
    });

    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '用户不存在'
      });
    }

    req.user = {
      userId: user.userId,
      role: user.role,
      permissions: user.permissions.map(p => p.permission)
    };

    next();
  } catch (error) {
    res.status(401).json({
      code: 401,
      message: 'Token无效或已过期'
    });
  }
};
```

### 5.2 权限验证中间件
```typescript
// src/middleware/permission.middleware.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export const requirePermission = (requiredPermissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userPermissions = req.user?.permissions || [];
    
    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        code: 403,
        message: '权限不足'
      });
    }

    next();
  };
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({
        code: 403,
        message: '角色权限不足'
      });
    }

    next();
  };
};
```

### 5.3 数据加密工具
```typescript
// src/utils/encryption.util.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = process.env.ENCRYPTION_KEY || 'default-secret-key';
const KEY = crypto.scryptSync(SECRET_KEY, 'salt', 32);

export class EncryptionUtil {
  static encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  static decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipher(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  static maskPhone(phone: string): string {
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }

  static maskIdCard(idCard: string): string {
    return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
  }
}
```

### 5.4 员工管理服务
```typescript
// src/services/employee.service.ts
import { AppDataSource } from '@/config/database.config';
import { Employee } from '@/models/entities/Employee.entity';
import { EmployeeCreateDto, EmployeeUpdateDto, EmployeeQueryDto } from '@/models/dto/employee.dto';
import { EncryptionUtil } from '@/utils/encryption.util';
import { Repository } from 'typeorm';

export class EmployeeService {
  private employeeRepository: Repository<Employee>;

  constructor() {
    this.employeeRepository = AppDataSource.getRepository(Employee);
  }

  async getEmployees(query: EmployeeQueryDto, userRole: string, userId: string) {
    const { page = 1, size = 10, department, status, keyword } = query;
    
    const queryBuilder = this.employeeRepository.createQueryBuilder('employee')
      .leftJoinAndSelect('employee.department', 'department')
      .skip((page - 1) * size)
      .take(size);

    // 根据用户角色过滤数据
    if (userRole === 'employee') {
      queryBuilder.where('employee.dingtalkUserId = :userId', { userId });
    }

    if (department) {
      queryBuilder.andWhere('department.name = :department', { department });
    }

    if (status) {
      queryBuilder.andWhere('employee.status = :status', { status });
    }

    if (keyword) {
      queryBuilder.andWhere('(employee.name LIKE :keyword OR employee.employeeNumber LIKE :keyword)', {
        keyword: `%${keyword}%`
      });
    }

    const [employees, total] = await queryBuilder.getManyAndCount();

    // 数据脱敏处理
    const processedEmployees = employees.map(employee => ({
      ...employee,
      phone: userRole === 'employee' ? employee.phone : EncryptionUtil.maskPhone(employee.phone),
      idCard: undefined // 身份证号不返回给前端
    }));

    return {
      list: processedEmployees,
      total,
      page,
      size
    };
  }

  async createEmployee(data: EmployeeCreateDto, createdBy: string): Promise<Employee> {
    const employee = new Employee();
    Object.assign(employee, data);
    
    // 加密敏感信息
    if (data.idCard) {
      employee.idCardEncrypted = EncryptionUtil.encrypt(data.idCard);
    }
    
    employee.createdBy = createdBy;
    employee.status = 'pending';
    employee.dataComplete = false;

    return this.employeeRepository.save(employee);
  }

  async updateEmployee(employeeId: string, data: EmployeeUpdateDto): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { employeeId }
    });

    if (!employee) {
      throw new Error('员工不存在');
    }

    Object.assign(employee, data);

    // 更新加密信息
    if (data.idCard) {
      employee.idCardEncrypted = EncryptionUtil.encrypt(data.idCard);
    }

    return this.employeeRepository.save(employee);
  }

  async deleteEmployee(employeeId: string): Promise<void> {
    const result = await this.employeeRepository.delete(employeeId);
    
    if (result.affected === 0) {
      throw new Error('员工不存在');
    }
  }

  async importEmployeesFromExcel(fileBuffer: Buffer, createdBy: string) {
    const XLSX = require('xlsx');
    const workbook = XLSX.read(fileBuffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const results = {
      totalCount: data.length,
      successCount: 0,
      failCount: 0,
      failList: [] as any[]
    };

    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];
        
        // 数据验证
        if (!row['姓名'] || !row['公司编号']) {
          throw new Error('姓名和公司编号不能为空');
        }

        const employee = new Employee();
        employee.name = row['姓名'];
        employee.employeeNumber = row['公司编号'];
        employee.phone = row['联系电话'];
        employee.email = row['邮箱'] || '';
        employee.position = row['岗位'];
        employee.hireDate = new Date(row['入职时间']);
        employee.gender = row['性别'] === '男' ? 'male' : 'female';
        employee.birthDate = new Date(row['出生日期']);
        employee.createdBy = createdBy;
        employee.status = 'pending';
        
        if (row['身份证号码']) {
          employee.idCardEncrypted = EncryptionUtil.encrypt(row['身份证号码']);
        }

        await this.employeeRepository.save(employee);
        results.successCount++;
        
      } catch (error) {
        results.failCount++;
        results.failList.push({
          row: i + 2, // Excel行号从2开始
          name: data[i]['姓名'] || '',
          error: error.message
        });
      }
    }

    return results;
  }
}
```

### 5.5 钉钉服务集成
```typescript
// src/services/dingtalk.service.ts
import axios from 'axios';

export class DingTalkService {
  private appKey: string;
  private appSecret: string;
  private baseURL = 'https://oapi.dingtalk.com';

  constructor() {
    this.appKey = process.env.DINGTALK_APP_KEY!;
    this.appSecret = process.env.DINGTALK_APP_SECRET!;
  }

  async getAccessToken(): Promise<string> {
    const response = await axios.get(`${this.baseURL}/gettoken`, {
      params: {
        appkey: this.appKey,
        appsecret: this.appSecret
      }
    });

    if (response.data.errcode !== 0) {
      throw new Error(`获取AccessToken失败: ${response.data.errmsg}`);
    }

    return response.data.access_token;
  }

  async getUserInfo(authCode: string): Promise<any> {
    const accessToken = await this.getAccessToken();
    
    // 通过免登授权码获取用户信息
    const userResponse = await axios.post(`${this.baseURL}/user/getuserinfo`, {
      code: authCode
    }, {
      params: { access_token: accessToken }
    });

    if (userResponse.data.errcode !== 0) {
      throw new Error(`获取用户信息失败: ${userResponse.data.errmsg}`);
    }

    const userId = userResponse.data.userid;
    
    // 获取用户详细信息
    const detailResponse = await axios.get(`${this.baseURL}/user/get`, {
      params: {
        access_token: accessToken,
        userid: userId
      }
    });

    return detailResponse.data;
  }

  async sendWorkNotification(userId: string, message: string): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    
    const response = await axios.post(`${this.baseURL}/message/send`, {
      touser: userId,
      msgtype: 'text',
      text: {
        content: message
      }
    }, {
      params: { access_token: accessToken }
    });

    return response.data.errcode === 0;
  }

  async getDepartments(): Promise<any[]> {
    const accessToken = await this.getAccessToken();
    
    const response = await axios.get(`${this.baseURL}/department/list`, {
      params: { access_token: accessToken }
    });

    if (response.data.errcode !== 0) {
      throw new Error(`获取部门列表失败: ${response.data.errmsg}`);
    }

    return response.data.department;
  }
}
```

### 5.6 入职流程服务
```typescript
// src/services/onboarding.service.ts
import { AppDataSource } from '@/config/database.config';
import { OnboardingProcess } from '@/models/entities/OnboardingProcess.entity';
import { Employee } from '@/models/entities/Employee.entity';
import { DingTalkService } from './dingtalk.service';
import { NotificationService } from './notification.service';
import crypto from 'crypto';

export class OnboardingService {
  private onboardingRepository;
  private employeeRepository;
  private dingTalkService: DingTalkService;
  private notificationService: NotificationService;

  constructor() {
    this.onboardingRepository = AppDataSource.getRepository(OnboardingProcess);
    this.employeeRepository = AppDataSource.getRepository(Employee);
    this.dingTalkService = new DingTalkService();
    this.notificationService = new NotificationService();
  }

  async createOnboardingProcess(employeeId: string): Promise<string> {
    const employee = await this.employeeRepository.findOne({
      where: { employeeId }
    });

    if (!employee) {
      throw new Error('员工不存在');
    }

    // 生成唯一token
    const token = crypto.randomBytes(32).toString('hex');
    const formLink = `${process.env.FRONTEND_URL}/onboarding/form/${token}`;

    const process = new OnboardingProcess();
    process.employee = employee;
    process.processStatus = 'pending';
    process.formToken = token;
    process.formLink = formLink;

    await this.onboardingRepository.save(process);
    return token;
  }

  async sendOnboardingNotification(employeeId: string, method: 'dingtalk' | 'sms' | 'manual' = 'dingtalk'): Promise<boolean> {
    const process = await this.onboardingRepository.findOne({
      where: { employee: { employeeId } },
      relations: ['employee']
    });

    if (!process) {
      throw new Error('入职流程不存在');
    }

    const message = `您好 ${process.employee.name}，欢迎加入公司！请点击以下链接完善您的入职信息：${process.formLink}`;
    
    let success = false;

    try {
      switch (method) {
        case 'dingtalk':
          if (process.employee.dingtalkUserId) {
            success = await this.dingTalkService.sendWorkNotification(
              process.employee.dingtalkUserId,
              message
            );
          }
          break;
          
        case 'sms':
          success = await this.notificationService.sendSMS(
            process.employee.phone,
            message
          );
          break;
          
        case 'manual':
          // HR手动发送，标记为已发送
          success = true;
          break;
      }

      if (success) {
        process.processStatus = 'sent';
        process.notificationMethod = method;
        process.sentTime = new Date();
        await this.onboardingRepository.save(process);
      }

    } catch (error) {
      console.error('发送入职通知失败:', error);
    }

    return success;
  }

  async getOnboardingForm(token: string) {
    const process = await this.onboardingRepository.findOne({
      where: { formToken: token },
      relations: ['employee', 'employee.department']
    });

    if (!process) {
      throw new Error('表单不存在或已过期');
    }

    return {
      employeeInfo: {
        name: process.employee.name,
        employeeNumber: process.employee.employeeNumber,
        department: process.employee.department?.name,
        position: process.employee.position,
        hireDate: process.employee.hireDate
      },
      formFields: [
        { field: 'phone', label: '手机号码', type: 'text', required: true },
        { field: 'email', label: '邮箱地址', type: 'email', required: true },
        { field: 'idCard', label: '身份证号', type: 'text', required: true },
        { field: 'birthDate', label: '出生日期', type: 'date', required: true },
        { field: 'gender', label: '性别', type: 'select', required: true },
        { field: 'address', label: '家庭住址', type: 'textarea', required: false }
      ]
    };
  }

  async submitOnboardingForm(token: string, data: any): Promise<void> {
    const process = await this.onboardingRepository.findOne({
      where: { formToken: token },
      relations: ['employee']
    });

    if (!process) {
      throw new Error('表单不存在或已过期');
    }

    // 更新员工信息
    const employee = process.employee;
    Object.assign(employee, data);
    employee.dataComplete = true;
    employee.status = 'completed';

    // 加密敏感信息
    if (data.idCard) {
      employee.idCardEncrypted = EncryptionUtil.encrypt(data.idCard);
    }

    await this.employeeRepository.save(employee);

    // 更新流程状态
    process.processStatus = 'completed';
    process.completedTime = new Date();
    await this.onboardingRepository.save(process);
  }
}
```

## 6. 定时任务

```typescript
// src/jobs/onboarding.job.ts
import cron from 'node-cron';
import { AppDataSource } from '@/config/database.config';
import { Employee } from '@/models/entities/Employee.entity';
import { OnboardingService } from '@/services/onboarding.service';
import { Between } from 'typeorm';

export class OnboardingJob {
  private onboardingService: OnboardingService;

  constructor() {
    this.onboardingService = new OnboardingService();
  }

  // 每日上午9点检查入职员工
  start() {
    cron.schedule('0 9 * * *', async () => {
      try {
        await this.processOnboardingNotifications();
      } catch (error) {
        console.error('入职通知任务执行失败:', error);
      }
    }, {
      timezone: 'Asia/Shanghai'
    });
  }

  private async processOnboardingNotifications() {
    const employeeRepository = AppDataSource.getRepository(Employee);
    
    // 获取今天入职的员工
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayHires = await employeeRepository.find({
      where: {
        hireDate: Between(today, tomorrow),
        status: 'pending'
      }
    });

    for (const employee of todayHires) {
      try {
        // 创建入职流程
        await this.onboardingService.createOnboardingProcess(employee.employeeId);
        
        // 发送通知
        let success = await this.onboardingService.sendOnboardingNotification(
          employee.employeeId, 
          'dingtalk'
        );

        // 如果钉钉发送失败，尝试短信
        if (!success) {
          success = await this.onboardingService.sendOnboardingNotification(
            employee.employeeId, 
            'sms'
          );
        }

        console.log(`员工 ${employee.name} 入职通知发送${success ? '成功' : '失败'}`);
        
      } catch (error) {
        console.error(`处理员工 ${employee.name} 入职流程失败:`, error);
      }
    }
  }
}
```

## 7. 测试

### 7.1 单元测试
```typescript
// tests/services/employee.service.test.ts
import { EmployeeService } from '@/services/employee.service';
import { AppDataSource } from '@/config/database.config';

describe('EmployeeService', () => {
  let employeeService: EmployeeService;

  beforeAll(async () => {
    await AppDataSource.initialize();
    employeeService = new EmployeeService();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  describe('createEmployee', () => {
    it('should create employee successfully', async () => {
      const employeeData = {
        name: '测试员工',
        employeeNumber: 'TEST001',
        phone: '13888888888',
        email: 'test@example.com',
        position: '测试工程师',
        hireDate: new Date('2025-09-10'),
        gender: 'male',
        birthDate: new Date('1990-01-01')
      };

      const employee = await employeeService.createEmployee(employeeData, 'admin');
      
      expect(employee.name).toBe(employeeData.name);
      expect(employee.status).toBe('pending');
      expect(employee.dataComplete).toBe(false);
    });
  });

  describe('getEmployees', () => {
    it('should return paginated employee list', async () => {
      const result = await employeeService.getEmployees({
        page: 1,
        size: 10
      }, 'hr', 'hr-user-id');

      expect(result).toHaveProperty('list');
      expect(result).toHaveProperty('total');
      expect(result.page).toBe(1);
      expect(result.size).toBe(10);
    });
  });
});
```

### 7.2 集成测试
```typescript
// tests/controllers/employee.controller.test.ts
import request from 'supertest';
import { app } from '@/app';

describe('Employee Controller', () => {
  describe('GET /api/v1/employees', () => {
    it('should return employee list with valid token', async () => {
      const token = 'valid-jwt-token';
      
      const response = await request(app)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.code).toBe(200);
      expect(response.body.data).toHaveProperty('list');
    });

    it('should return 401 without token', async () => {
      await request(app)
        .get('/api/v1/employees')
        .expect(401);
    });
  });
});
```

## 8. 部署

### 8.1 Docker配置
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 8080

# 启动应用
CMD ["npm", "start"]
```

### 8.2 Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - REDIS_HOST=redis
    depends_on:
      - mysql
      - redis
    volumes:
      - ./uploads:/app/uploads

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=hrsystem
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  mysql_data:
```

### 8.3 PM2部署
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'hrsystem-api',
    script: './dist/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z'
  }]
};
```

## 9. 监控和日志

### 9.1 日志配置
```typescript
// src/utils/logger.util.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'hrsystem-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;
```

### 9.2 性能监控
```typescript
// src/middleware/monitoring.middleware.ts
import { Request, Response, NextFunction } from 'express';
import logger from '@/utils/logger.util';

export const performanceMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };

    if (duration > 1000) {
      logger.warn('Slow request detected', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
};
```
