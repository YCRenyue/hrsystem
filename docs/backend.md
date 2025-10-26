# 后端开发指南

## 1. 技术栈

### 1.1 核心框架
- **Python 3.11**: 编程语言
- **FastAPI 0.104**: 现代Web API框架
- **SQLAlchemy 2.x**: Python ORM框架
- **MySQL 8.0**: 关系型数据库
- **Pydantic 2.x**: 数据验证和序列化

### 1.2 数据库和存储
- **SQLAlchemy**: Python ORM框架
- **PyMySQL**: MySQL驱动
- **Alembic**: 数据库迁移工具
- **boto3**: AWS S3 SDK

### 1.3 认证和安全
- **python-jose**: JWT Token处理
- **passlib**: 密码加密
- **python-multipart**: 文件上传处理
- **cryptography**: 数据加密
- **bcrypt**: 密码哈希

### 1.4 工具库
- **httpx**: HTTP客户端
- **celery**: 异步任务队列
- **python-dotenv**: 环境变量管理
- **loguru**: 日志记录
- **pytest**: 单元测试

## 2. 项目结构

```
backend/
├── app/
│   ├── api/                # API路由
│   │   ├── v1/
│   │   │   ├── auth.py
│   │   │   ├── employees.py
│   │   │   ├── onboarding.py
│   │   │   └── files.py
│   │   └── deps.py         # 依赖项
│   ├── core/               # 核心配置
│   │   ├── config.py
│   │   ├── security.py
│   │   └── database.py
│   ├── models/             # 数据模型
│   │   ├── employee.py
│   │   ├── user.py
│   │   └── document.py
│   ├── schemas/            # Pydantic模式
│   │   ├── employee.py
│   │   ├── user.py
│   │   └── response.py
│   ├── services/           # 业务逻辑层
│   │   ├── auth_service.py
│   │   ├── employee_service.py
│   │   ├── file_service.py
│   │   └── dingtalk_service.py
│   ├── utils/              # 工具函数
│   │   ├── encryption.py
│   │   ├── s3_client.py
│   │   └── logger.py
│   └── main.py             # 应用入口
├── migrations/             # 数据库迁移
├── tests/                  # 测试文件
├── requirements.txt
├── .env.example
└── alembic.ini
```
## 3. 环境搭建

### 3.1 环境要求
- Python >= 3.11.0
- MySQL >= 8.0
- pip >= 23.0.0

### 3.2 项目初始化
```bash
# 创建项目目录
mkdir hrsystem-backend
cd hrsystem-backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# 安装核心依赖
pip install fastapi uvicorn
pip install sqlalchemy pymysql
pip install alembic
pip install pydantic[email]
pip install python-jose[cryptography]
pip install passlib[bcrypt]
pip install python-multipart
pip install boto3
pip install httpx
pip install python-dotenv
pip install loguru

# 安装开发依赖
pip install pytest pytest-asyncio
pip install black isort flake8
pip install mypy
```

### 3.3 配置文件

#### 依赖配置 (requirements.txt)
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
pymysql==1.1.0
alembic==1.13.0
pydantic[email]==2.5.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
boto3==1.34.0
httpx==0.25.2
python-dotenv==1.0.0
loguru==0.7.2
cryptography==41.0.8

# 开发依赖
pytest==7.4.3
pytest-asyncio==0.21.1
black==23.11.0
isort==5.12.0
flake8==6.1.0
mypy==1.7.1
```,
#### 环境变量 (.env.example)
```env
# 服务器配置
APP_NAME=HR System API
APP_VERSION=1.0.0
DEBUG=True
HOST=0.0.0.0
PORT=8000

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_DATABASE=hrsystem

# JWT配置
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# 钉钉配置
DINGTALK_APP_KEY=your-app-key
DINGTALK_APP_SECRET=your-app-secret
DINGTALK_CORP_ID=your-corp-id

# AWS S3配置
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_DEFAULT_REGION=us-east-1
S3_BUCKET_NAME=hrsystem-documents

# 加密配置
ENCRYPTION_KEY=your-aes-256-encryption-key
HASH_SALT=your-hash-salt

# 日志配置
LOG_LEVEL=INFO
LOG_FILE=logs/app.log
```

#### 应用配置 (app/core/config.py)
```python
from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # 应用配置
    APP_NAME: str = "HR System API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # 数据库配置
    DB_HOST: str
    DB_PORT: int = 3306
    DB_USERNAME: str
    DB_PASSWORD: str
    DB_DATABASE: str
    
    # JWT配置
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ALGORITHM: str = "HS256"
    
    # 钉钉配置
    DINGTALK_APP_KEY: str
    DINGTALK_APP_SECRET: str
    DINGTALK_CORP_ID: Optional[str] = None
    
    # AWS S3配置
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_DEFAULT_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str
    
    # 加密配置
    ENCRYPTION_KEY: str
    HASH_SALT: str
    
    # 日志配置
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"
    
    @property
    def database_url(self) -> str:
        return f"mysql+pymysql://{self.DB_USERNAME}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_DATABASE}"
    
    class Config:
        env_file = ".env"

settings = Settings()
```

## 4. 数据模型设计

### 4.1 数据库配置
```python
# app/core/database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# 创建数据库引擎
engine = create_engine(
    settings.database_url,
    pool_size=20,
    max_overflow=30,
    pool_timeout=30,
    pool_recycle=3600,
    pool_pre_ping=True,
    echo=settings.DEBUG
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建基类
Base = declarative_base()

# 数据库依赖
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 4.2 员工模型定义
```python
# app/models/employee.py
from sqlalchemy import Column, String, Date, Boolean, Text, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid

class Employee(Base):
    __tablename__ = "employees"
    
    employee_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_number = Column(String(20), unique=True, nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.user_id"), unique=True)
    
    # 加密字段
    name_encrypted = Column(Text, nullable=False, comment="姓名（加密）")
    name_hash = Column(String(64), index=True, comment="姓名哈希（用于搜索）")
    birth_date_encrypted = Column(Text, comment="出生日期（加密）")
    id_card_encrypted = Column(Text, comment="身份证号（加密）")
    phone_encrypted = Column(Text, comment="手机号（加密）")
    phone_hash = Column(String(64), index=True, comment="手机号哈希（用于搜索）")
    bank_card_encrypted = Column(Text, comment="银行卡号（加密）")
    emergency_phone_encrypted = Column(Text, comment="紧急联系电话（加密）")
    
    # 明文字段
    name_en = Column(String(100), comment="英文姓名")
    gender = Column(Enum('male', 'female'), nullable=False)
    email = Column(String(100))
    emergency_contact = Column(String(50))
    address = Column(Text)
    avatar_url = Column(String(255))
    
    # S3文件路径
    id_card_front_s3_path = Column(String(500), comment="身份证正面S3路径")
    id_card_back_s3_path = Column(String(500), comment="身份证背面S3路径")
    
    # 工作信息
    hire_date = Column(Date, nullable=False)
    probation_end_date = Column(Date)
    department_id = Column(String(36), ForeignKey("departments.department_id"), nullable=False)
    position_id = Column(String(36), ForeignKey("positions.position_id"), nullable=False)
    manager_id = Column(String(36), ForeignKey("employees.employee_id"))
    work_location = Column(String(100))
    
    employment_type = Column(
        Enum('full_time', 'part_time', 'intern', 'contractor'), 
        default='full_time'
    )
    employment_status = Column(
        Enum('pending', 'probation', 'regular', 'resigned', 'terminated'),
        default='pending',
        index=True
    )
    
    resignation_date = Column(Date)
    resignation_reason = Column(Text)
    data_complete = Column(Boolean, default=False)
    dingtalk_user_id = Column(String(100), index=True)
    remarks = Column(Text)
    
    # 审计字段
    created_by = Column(String(36))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # 关系
    user = relationship("User", back_populates="employee")
    department = relationship("Department")
    position = relationship("Position")
    manager = relationship("Employee", remote_side=[employee_id])
    documents = relationship("EmployeeDocument", back_populates="employee")
### 4.3 Pydantic模式定义
```python
# app/schemas/employee.py
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import date, datetime
from enum import Enum

class GenderEnum(str, Enum):
    male = "male"
    female = "female"

class EmploymentTypeEnum(str, Enum):
    full_time = "full_time"
    part_time = "part_time"
    intern = "intern"
    contractor = "contractor"

class EmploymentStatusEnum(str, Enum):
    pending = "pending"
    probation = "probation"
    regular = "regular"
    resigned = "resigned"
    terminated = "terminated"

class EmployeeBase(BaseModel):
    employee_number: str = Field(..., description="工号")
    name_en: Optional[str] = Field(None, description="英文姓名")
    gender: GenderEnum
    email: Optional[EmailStr] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None
    hire_date: date
    probation_end_date: Optional[date] = None
    department_id: str
    position_id: str
    manager_id: Optional[str] = None
    work_location: Optional[str] = None
    employment_type: EmploymentTypeEnum = EmploymentTypeEnum.full_time
    remarks: Optional[str] = None

class EmployeeCreate(EmployeeBase):
    name: str = Field(..., description="姓名（明文，将被加密存储）")
    birth_date: Optional[date] = None
    id_card: Optional[str] = Field(None, description="身份证号（明文，将被加密存储）")
    phone: Optional[str] = Field(None, description="手机号（明文，将被加密存储）")
    bank_card: Optional[str] = Field(None, description="银行卡号（明文，将被加密存储）")
    emergency_phone: Optional[str] = None

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    name_en: Optional[str] = None
    gender: Optional[GenderEnum] = None
    birth_date: Optional[date] = None
    id_card: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    bank_card: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    address: Optional[str] = None
    department_id: Optional[str] = None
    position_id: Optional[str] = None
    manager_id: Optional[str] = None
    employment_status: Optional[EmploymentStatusEnum] = None
    remarks: Optional[str] = None

class EmployeeResponse(BaseModel):
    employee_id: str
    employee_number: str
    name: str  # 解密后的姓名
    name_en: Optional[str]
    gender: GenderEnum
    phone: Optional[str]  # 根据权限决定是否脱敏
    email: Optional[str]
    hire_date: date
    employment_status: EmploymentStatusEnum
    department_name: Optional[str]
    position_name: Optional[str]
    data_complete: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
## 5. 核心功能实现

### 5.1 加密工具类
```python
# app/utils/encryption.py
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import hashlib
import os
from app.core.config import settings

class EncryptionUtil:
    def __init__(self):
        self._key = self._derive_key(settings.ENCRYPTION_KEY)
        self._fernet = Fernet(self._key)
    
    def _derive_key(self, password: str) -> bytes:
        """从密码派生加密密钥"""
        password_bytes = password.encode()
        salt = settings.HASH_SALT.encode()
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password_bytes))
        return key
    
    def encrypt(self, data: str) -> str:
        """加密数据"""
        if not data:
            return ""
        encrypted_data = self._fernet.encrypt(data.encode())
        return base64.urlsafe_b64encode(encrypted_data).decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        """解密数据"""
        if not encrypted_data:
            return ""
        try:
            decoded_data = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted_data = self._fernet.decrypt(decoded_data)
            return decrypted_data.decode()
        except Exception:
            return ""
    
    def hash_for_search(self, data: str) -> str:
        """为搜索生成哈希值"""
        if not data:
            return ""
        return hashlib.sha256((data + settings.HASH_SALT).encode()).hexdigest()
    
    def mask_phone(self, phone: str) -> str:
        """手机号脱敏"""
        if len(phone) != 11:
            return phone
        return phone[:3] + "****" + phone[7:]
    
    def mask_id_card(self, id_card: str) -> str:
        """身份证号脱敏"""
        if len(id_card) != 18:
            return id_card
        return id_card[:6] + "********" + id_card[14:]

# 全局实例
encryption_util = EncryptionUtil()
```

### 5.2 S3文件服务
```python
# app/utils/s3_client.py
import boto3
from botocore.exceptions import ClientError
from typing import Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from app.core.config import settings
from loguru import logger

class S3FileService:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_DEFAULT_REGION
        )
        self.bucket_name = settings.S3_BUCKET_NAME
    
    def upload_file(
        self, 
        file_content: bytes, 
        employee_id: str, 
        document_type: str,
        file_extension: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """上传文件到S3"""
        try:
            file_id = str(uuid.uuid4())
            s3_key = f"employees/{employee_id}/{document_type}/{file_id}.{file_extension}"
            
            extra_args = {
                'ServerSideEncryption': 'AES256',
                'Metadata': metadata or {}
            }
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=file_content,
                **extra_args
            )
            
            logger.info(f"File uploaded successfully: {s3_key}")
            return s3_key
            
        except ClientError as e:
            logger.error(f"Failed to upload file: {e}")
            return None
    
    def get_presigned_url(
        self, 
        s3_key: str, 
        expiration: int = 3600
    ) -> Optional[str]:
        """生成预签名URL用于文件访问"""
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': s3_key},
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            return None
    
    def delete_file(self, s3_key: str) -> bool:
        """删除S3文件"""
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            logger.info(f"File deleted successfully: {s3_key}")
            return True
        except ClientError as e:
            logger.error(f"Failed to delete file: {e}")
            return False
    
    def copy_file(self, source_key: str, dest_key: str) -> bool:
        """复制S3文件"""
        try:
            copy_source = {'Bucket': self.bucket_name, 'Key': source_key}
            self.s3_client.copy_object(
                CopySource=copy_source,
                Bucket=self.bucket_name,
                Key=dest_key,
                ServerSideEncryption='AES256'
            )
            logger.info(f"File copied from {source_key} to {dest_key}")
            return True
        except ClientError as e:
            logger.error(f"Failed to copy file: {e}")
            return False

# 全局实例
s3_service = S3FileService()
```

### 5.3 员工服务
```python
# app/services/employee_service.py
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from app.utils.encryption import encryption_util
from app.utils.s3_client import s3_service
import pandas as pd
from io import BytesIO

class EmployeeService:
    def __init__(self, db: Session):
        self.db = db
    
    def create_employee(
        self, 
        employee_data: EmployeeCreate, 
        created_by: str
    ) -> Employee:
        """创建员工"""
        # 检查工号是否存在
        existing = self.db.query(Employee).filter(
            Employee.employee_number == employee_data.employee_number
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee number already exists"
            )
        
        # 创建员工对象
        employee = Employee(
            employee_number=employee_data.employee_number,
            name_encrypted=encryption_util.encrypt(employee_data.name),
            name_hash=encryption_util.hash_for_search(employee_data.name),
            name_en=employee_data.name_en,
            gender=employee_data.gender,
            email=employee_data.email,
            hire_date=employee_data.hire_date,
            probation_end_date=employee_data.probation_end_date,
            department_id=employee_data.department_id,
            position_id=employee_data.position_id,
            manager_id=employee_data.manager_id,
            work_location=employee_data.work_location,
            employment_type=employee_data.employment_type,
            remarks=employee_data.remarks,
            created_by=created_by
        )
        
        # 加密敏感信息
        if employee_data.birth_date:
            employee.birth_date_encrypted = encryption_util.encrypt(
                employee_data.birth_date.isoformat()
            )
        
        if employee_data.id_card:
            employee.id_card_encrypted = encryption_util.encrypt(employee_data.id_card)
        
        if employee_data.phone:
            employee.phone_encrypted = encryption_util.encrypt(employee_data.phone)
            employee.phone_hash = encryption_util.hash_for_search(employee_data.phone)
        
        if employee_data.bank_card:
            employee.bank_card_encrypted = encryption_util.encrypt(employee_data.bank_card)
        
        if employee_data.emergency_phone:
            employee.emergency_phone_encrypted = encryption_util.encrypt(
                employee_data.emergency_phone
            )
        
        self.db.add(employee)
        self.db.commit()
        self.db.refresh(employee)
        
        return employee
    
    def get_employees(
        self,
        skip: int = 0,
        limit: int = 100,
        department_id: Optional[str] = None,
        employment_status: Optional[str] = None,
        keyword: Optional[str] = None,
        user_role: str = "employee",
        user_id: str = None
    ) -> Dict[str, Any]:
        """获取员工列表"""
        query = self.db.query(Employee)
        
        # 权限过滤
        if user_role == "employee":
            query = query.filter(Employee.user_id == user_id)
        
        # 条件过滤
        if department_id:
            query = query.filter(Employee.department_id == department_id)
        
        if employment_status:
            query = query.filter(Employee.employment_status == employment_status)
        
        if keyword:
            keyword_hash = encryption_util.hash_for_search(keyword)
            query = query.filter(or_(
                Employee.name_hash == keyword_hash,
                Employee.phone_hash == keyword_hash,
                Employee.employee_number.like(f"%{keyword}%")
            ))
        
        total = query.count()
        employees = query.offset(skip).limit(limit).all()
        
        # 数据脱敏处理
        processed_employees = []
        for emp in employees:
            emp_dict = {
                "employee_id": emp.employee_id,
                "employee_number": emp.employee_number,
                "name": encryption_util.decrypt(emp.name_encrypted),
                "gender": emp.gender,
                "email": emp.email,
                "hire_date": emp.hire_date,
                "employment_status": emp.employment_status,
                "data_complete": emp.data_complete,
                "created_at": emp.created_at
            }
            
            # 根据权限决定电话显示
            if user_role in ["hr_admin", "super_admin"]:
                phone = encryption_util.decrypt(emp.phone_encrypted) if emp.phone_encrypted else None
                emp_dict["phone"] = phone
            else:
                phone = encryption_util.decrypt(emp.phone_encrypted) if emp.phone_encrypted else None
                emp_dict["phone"] = encryption_util.mask_phone(phone) if phone else None
            
            processed_employees.append(emp_dict)
        
        return {
            "employees": processed_employees,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    
    def upload_id_card(
        self, 
        employee_id: str, 
        file_content: bytes, 
        file_type: str,  # 'front' or 'back'
        file_extension: str
    ) -> bool:
        """上传身份证复印件"""
        employee = self.db.query(Employee).filter(
            Employee.employee_id == employee_id
        ).first()
        
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found"
            )
        
        # 上传到S3
        document_type = f"id_card_{file_type}"
        s3_key = s3_service.upload_file(
            file_content=file_content,
            employee_id=employee_id,
            document_type=document_type,
            file_extension=file_extension,
            metadata={
                "employee_id": employee_id,
                "document_type": document_type,
                "upload_time": datetime.now().isoformat()
            }
        )
        
        if not s3_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload file"
            )
        
        # 更新数据库记录
        if file_type == "front":
            employee.id_card_front_s3_path = s3_key
        else:
            employee.id_card_back_s3_path = s3_key
        
        self.db.commit()
        return True
    
    def import_from_excel(
        self, 
        file_content: bytes, 
        created_by: str
    ) -> Dict[str, Any]:
        """从Excel导入员工数据"""
        try:
            df = pd.read_excel(BytesIO(file_content))
            
            results = {
                "total_count": len(df),
                "success_count": 0,
                "fail_count": 0,
                "fail_list": []
            }
            
            for index, row in df.iterrows():
                try:
                    employee_data = EmployeeCreate(
                        employee_number=str(row.get('工号', '')),
                        name=str(row.get('姓名', '')),
                        gender='male' if row.get('性别') == '男' else 'female',
                        phone=str(row.get('手机号', '')),
                        email=str(row.get('邮箱', '')),
                        hire_date=pd.to_datetime(row.get('入职日期')).date(),
                        department_id=str(row.get('部门ID', '')),
                        position_id=str(row.get('职位ID', ''))
                    )
                    
                    if row.get('身份证号'):
                        employee_data.id_card = str(row.get('身份证号'))
                    
                    if row.get('出生日期'):
                        employee_data.birth_date = pd.to_datetime(row.get('出生日期')).date()
                    
                    self.create_employee(employee_data, created_by)
                    results["success_count"] += 1
                    
                except Exception as e:
                    results["fail_count"] += 1
                    results["fail_list"].append({
                        "row": index + 2,
                        "name": row.get('姓名', ''),
                        "error": str(e)
                    })
            
            return results
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to process Excel file: {str(e)}"
            )
```

### 5.1 认证中间件
```python
# src/middleware/auth.py
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from src.database import get_db
from src.models.user import User
from src.utils.auth import verify_token
from src.utils.jwt_handler import decode_jwt
from typing import Optional

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """认证中间件 - 验证用户token并返回用户信息"""
    try:
        token = credentials.credentials
        payload = decode_jwt(token)
        user_id = payload.get("user_id")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token无效"
            )
            
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户不存在"
            )
            
        return user
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token无效或已过期"
        )

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """获取当前活跃用户"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="用户已被禁用"
        )
    return current_user
```

### 5.2 权限验证中间件
```typescript
// src/middleware/permission.middleware.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export const requirePermission = (requiredPermissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
### 5.2 权限验证中间件
```python
# src/middleware/permission.py
from fastapi import HTTPException, Depends, status
from src.models.user import User
from src.middleware.auth import get_current_active_user
from typing import List

def require_permissions(required_permissions: List[str]):
    """权限验证装饰器工厂"""
    def permission_dependency(current_user: User = Depends(get_current_active_user)):
        user_permissions = [p.permission for p in current_user.permissions]
        
        has_permission = any(
            permission in user_permissions 
            for permission in required_permissions
        )
        
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="权限不足"
            )
        
        return current_user
    
    return permission_dependency

def require_roles(required_roles: List[str]):
    """角色验证装饰器工厂"""
    def role_dependency(current_user: User = Depends(get_current_active_user)):
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="角色权限不足"
            )
        return current_user
    
    return role_dependency
```

### 5.3 数据加密工具
```python
# src/utils/encryption.py
import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from typing import Optional

class EncryptionUtil:
    """AES-256加密工具类"""
    
    def __init__(self):
        self.secret_key = os.getenv('ENCRYPTION_KEY', 'default-secret-key')
        self.salt = b'stable_salt_for_hr_system'  # 在生产环境中应该使用随机salt
        
    def _get_fernet(self) -> Fernet:
        """生成Fernet加密实例"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=self.salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(self.secret_key.encode()))
        return Fernet(key)
    
    def encrypt(self, text: str) -> str:
        """加密文本"""
        if not text:
            return ""
        
        f = self._get_fernet()
        encrypted_data = f.encrypt(text.encode())
        return base64.urlsafe_b64encode(encrypted_data).decode()
    
    def decrypt(self, encrypted_text: str) -> str:
        """解密文本"""
        if not encrypted_text:
            return ""
        
        try:
            f = self._get_fernet()
            encrypted_data = base64.urlsafe_b64decode(encrypted_text.encode())
            decrypted_data = f.decrypt(encrypted_data)
            return decrypted_data.decode()
        except Exception as e:
            raise ValueError(f"解密失败: {str(e)}")
    
    def is_encrypted(self, text: str) -> bool:
        """检查文本是否已加密"""
        try:
            # 尝试解码base64，如果成功则可能是加密数据
            base64.urlsafe_b64decode(text.encode())
            return True
        except Exception:
            return False

# 全局加密实例
encryption_util = EncryptionUtil()  static decrypt(encryptedData: string): string {
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
```python
# src/services/employee_service.py
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from src.models.employee import Employee
from src.models.department import Department
from src.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeQuery
from src.utils.encryption import encryption_util
from typing import List, Tuple, Optional
from fastapi import HTTPException, status

class EmployeeService:
    """员工管理服务类"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_employees(
        self, 
        query: EmployeeQuery, 
        user_role: str, 
        user_id: str
    ) -> Tuple[List[Employee], int]:
        """获取员工列表"""
        page = query.page or 1
        size = query.size or 10
        
        # 基础查询
        query_builder = self.db.query(Employee).options(
            joinedload(Employee.department)
        )
        
        # 根据用户角色过滤数据
        if user_role == 'employee':
            query_builder = query_builder.filter(Employee.dingtalk_user_id == user_id)
        
        # 部门过滤
        if query.department:
            query_builder = query_builder.join(Department).filter(
                Department.name == query.department
            )
        
        # 状态过滤
        if query.status:
            query_builder = query_builder.filter(Employee.status == query.status)
        
        # 关键词搜索
        if query.keyword:
            keyword_filter = or_(
                Employee.name.like(f"%{query.keyword}%"),
                Employee.employee_number.like(f"%{query.keyword}%")
            )
            query_builder = query_builder.filter(keyword_filter)
        
        # 分页查询
        total = query_builder.count()
        employees = query_builder.offset((page - 1) * size).limit(size).all()
        
        # 数据脱敏处理
        processed_employees = []
        for employee in employees:
            employee_dict = employee.__dict__.copy()
            
            # 解密敏感数据用于显示（部分脱敏）
            if employee.name_encrypted:
                decrypted_name = encryption_util.decrypt(employee.name_encrypted)
                employee_dict['name'] = decrypted_name
            
            if employee.phone_encrypted:
                decrypted_phone = encryption_util.decrypt(employee.phone_encrypted)
                # 手机号脱敏显示
                employee_dict['phone'] = self._mask_phone(decrypted_phone)
            
            if employee.id_card_encrypted:
                decrypted_id_card = encryption_util.decrypt(employee.id_card_encrypted)
                # 身份证号脱敏显示
                employee_dict['id_card'] = self._mask_id_card(decrypted_id_card)
            
            processed_employees.append(employee_dict)
        
        return processed_employees, total
    
    def _mask_phone(self, phone: str) -> str:
        """手机号脱敏"""
        if len(phone) == 11:
            return phone[:3] + "****" + phone[7:]
        return phone
    
    def _mask_id_card(self, id_card: str) -> str:
        """身份证号脱敏"""
        if len(id_card) == 18:
            return id_card[:6] + "********" + id_card[14:]
        return id_card
    
    async def create_employee(self, employee_data: EmployeeCreate, created_by: str) -> Employee:
        """创建员工"""
        employee = Employee()
        
        # 复制基本信息
        for field, value in employee_data.dict(exclude_unset=True).items():
            if field not in ['name', 'phone', 'id_card', 'bank_card']:
                setattr(employee, field, value)
        
        # 加密敏感信息
        if employee_data.name:
            employee.name_encrypted = encryption_util.encrypt(employee_data.name)
        
        if employee_data.phone:
            employee.phone_encrypted = encryption_util.encrypt(employee_data.phone)
        
        if employee_data.id_card:
            employee.id_card_encrypted = encryption_util.encrypt(employee_data.id_card)
        
        if employee_data.bank_card:
            employee.bank_card_encrypted = encryption_util.encrypt(employee_data.bank_card)
        
        employee.created_by = created_by
        employee.status = 'pending'
        employee.data_complete = False
        
        self.db.add(employee)
        self.db.commit()
        self.db.refresh(employee)
        
        return employee
    
    async def update_employee(self, employee_id: str, employee_data: EmployeeUpdate) -> Employee:
        """更新员工信息"""
        employee = self.db.query(Employee).filter(
            Employee.employee_id == employee_id
        ).first()
        
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="员工不存在"
            )
        
        # 更新基本信息
        for field, value in employee_data.dict(exclude_unset=True).items():
            if field not in ['name', 'phone', 'id_card', 'bank_card'] and value is not None:
                setattr(employee, field, value)
        
        # 更新加密信息
        if employee_data.name:
            employee.name_encrypted = encryption_util.encrypt(employee_data.name)
        
        if employee_data.phone:
            employee.phone_encrypted = encryption_util.encrypt(employee_data.phone)
        
        if employee_data.id_card:
            employee.id_card_encrypted = encryption_util.encrypt(employee_data.id_card)
        
        if employee_data.bank_card:
            employee.bank_card_encrypted = encryption_util.encrypt(employee_data.bank_card)
        
        self.db.commit()
        self.db.refresh(employee)
        
        return employee
    
    async def delete_employee(self, employee_id: str) -> None:
    const result = await this.employeeRepository.delete(employeeId);
    
    if (result.affected === 0) {
      throw new Error('员工不存在');
        """删除员工"""
        employee = self.db.query(Employee).filter(
            Employee.employee_id == employee_id
        ).first()
        
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="员工不存在"
            )
        
        self.db.delete(employee)
        self.db.commit()
    
    async def import_employees_from_excel(self, file_content: bytes, created_by: str) -> dict:
        """从Excel导入员工数据"""
        import openpyxl
        from io import BytesIO
        from datetime import datetime
        
        workbook = openpyxl.load_workbook(BytesIO(file_content))
        worksheet = workbook.active
        
        results = {
            'total_count': 0,
            'success_count': 0,
            'fail_count': 0,
            'fail_list': []
        }
        
        # 跳过标题行
        rows = list(worksheet.iter_rows(min_row=2, values_only=True))
        results['total_count'] = len(rows)
        
        for idx, row in enumerate(rows, start=2):
            try:
                # 假设Excel列顺序：姓名、公司编号、联系电话、邮箱、岗位、入职时间、性别、出生日期、身份证号码
                name = row[0]
                employee_number = row[1]
                phone = row[2]
                email = row[3] if row[3] else ''
                position = row[4]
                hire_date = row[5]
                gender = 'male' if row[6] == '男' else 'female'
                birth_date = row[7]
                id_card = row[8]
                
                # 数据验证
                if not name or not employee_number:
                    raise ValueError('姓名和公司编号不能为空')
                
                # 创建员工对象
                employee = Employee()
                employee.employee_number = employee_number
                employee.email = email
                employee.position = position
                employee.hire_date = hire_date if isinstance(hire_date, datetime) else datetime.strptime(str(hire_date), '%Y-%m-%d')
                employee.gender = gender
                employee.birth_date = birth_date if isinstance(birth_date, datetime) else datetime.strptime(str(birth_date), '%Y-%m-%d')
                employee.created_by = created_by
                employee.status = 'pending'
                employee.data_complete = False
                
                # 加密敏感信息
                employee.name_encrypted = encryption_util.encrypt(name)
                if phone:
                    employee.phone_encrypted = encryption_util.encrypt(str(phone))
                if id_card:
                    employee.id_card_encrypted = encryption_util.encrypt(str(id_card))
                
                self.db.add(employee)
                self.db.commit()
                
                results['success_count'] += 1
                
            except Exception as e:
                results['fail_count'] += 1
                results['fail_list'].append({
                    'row': idx,
                    'name': row[0] if row else '',
                })
                self.db.rollback()
        
        return results
```

### 5.5 钉钉服务集成
```python
# src/services/dingtalk_service.py
import os
import httpx
from typing import Optional, Dict
from fastapi import HTTPException, status

class DingTalkService:
    """钉钉服务集成类"""
    
    def __init__(self):
        self.app_key = os.getenv('DINGTALK_APP_KEY')
        self.app_secret = os.getenv('DINGTALK_APP_SECRET')
        self.base_url = 'https://oapi.dingtalk.com'
        self._access_token: Optional[str] = None
    
    async def get_access_token(self) -> str:
        """获取钉钉AccessToken"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/gettoken",
                params={
                    'appkey': self.app_key,
                    'appsecret': self.app_secret
                }
            )
            
            data = response.json()
            if data.get('errcode', 0) != 0:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"获取AccessToken失败: {data.get('errmsg')}"
                )
            
            self._access_token = data['access_token']
            return self._access_token
    
    async def get_user_info(self, auth_code: str) -> Dict:
        """通过免登授权码获取用户信息"""
        access_token = await self.get_access_token()
        
        async with httpx.AsyncClient() as client:
            # 获取用户基本信息
            user_response = await client.post(
                f"{self.base_url}/user/getuserinfo",
                params={'access_token': access_token},
                json={'code': auth_code}
            )
            
            user_data = user_response.json()
            if user_data.get('errcode', 0) != 0:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"获取用户信息失败: {user_data.get('errmsg')}"
                )
            
            user_id = user_data['userid']
            
            # 获取用户详细信息
            detail_response = await client.get(
                f"{self.base_url}/user/get",
                params={
                    'access_token': access_token,
                    'userid': user_id
                }
            )
            
            return detail_response.json()
    
    async def send_work_notification(self, user_id: str, message: str) -> bool:
        """发送工作通知"""
        access_token = await self.get_access_token()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/message/send",
                params={'access_token': access_token},
                json={
                    'touser': user_id,
                    'msgtype': 'text',
                    'text': {
                        'content': message
                    }
                }
            )
            
            data = response.json()
            return data.get('errcode', -1) == 0
    
    async def get_departments(self) -> list:
        """获取部门列表"""
        access_token = await self.get_access_token()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/department/list",
                params={'access_token': access_token}
            )
            
            data = response.json()
            if data.get('errcode', 0) != 0:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"获取部门列表失败: {data.get('errmsg')}"
                )
            
            return data.get('department', [])
```

### 5.6 入职流程服务
```python
# src/services/onboarding_service.py
import secrets
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from src.models.employee import Employee
from src.models.onboarding_process import OnboardingProcess
from src.services.dingtalk_service import DingTalkService
from src.services.notification_service import NotificationService
from fastapi import HTTPException, status
from typing import Optional

class OnboardingService:
    """入职流程服务类"""
    
    def __init__(self, db: Session):
        self.db = db
        self.dingtalk_service = DingTalkService()
        self.notification_service = NotificationService()
    
    async def create_onboarding_process(self, employee_id: str) -> str:
        """创建入职流程"""
        employee = self.db.query(Employee).filter(
            Employee.employee_id == employee_id
        ).first()
        
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="员工不存在"
            )
        
        # 生成安全令牌
        token = secrets.token_urlsafe(32)
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        form_link = f"{frontend_url}/onboarding/form/{token}"
        
        # 创建入职流程
        process = OnboardingProcess()
        process.employee_id = employee.employee_id
        process.process_status = 'pending'
        process.form_token = token
        process.form_link = form_link
        process.created_at = datetime.now()
        
        self.db.add(process)
        self.db.commit()
        
        return token
    
    async def send_onboarding_notification(
        self, 
        employee_id: str, 
        method: str = 'dingtalk'
    ) -> bool:
        """发送入职通知"""
        process = self.db.query(OnboardingProcess).join(Employee).filter(
            Employee.employee_id == employee_id
        ).first()
        
        if not process:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="入职流程不存在"
            )
        
        employee = process.employee
        decrypted_name = encryption_util.decrypt(employee.name_encrypted) if employee.name_encrypted else ''
        message = f"您好 {decrypted_name}，欢迎加入公司！请点击以下链接完善您的入职信息：{process.form_link}"
        
        success = False
        
        try:
            if method == 'dingtalk':
                if employee.dingtalk_user_id:
                    success = await self.dingtalk_service.send_work_notification(
                        employee.dingtalk_user_id,
                        message
                    )
            elif method == 'sms':
                decrypted_phone = encryption_util.decrypt(employee.phone_encrypted) if employee.phone_encrypted else ''
                success = await self.notification_service.send_sms(
                    decrypted_phone,
                    message
                )
            elif method == 'manual':
                # HR手动发送，标记为已发送
                success = True
            
            if success:
                process.process_status = 'sent'
                process.notification_method = method
                process.sent_time = datetime.now()
                self.db.commit()
        
        except Exception as e:
            print(f"发送入职通知失败: {str(e)}")
            success = False
        
        return success
    
    async def get_onboarding_form(self, token: str) -> dict:
        """获取入职登记表"""
        process = self.db.query(OnboardingProcess).filter(
            OnboardingProcess.form_token == token
        ).first()
        
        if not process:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="表单不存在或已过期"
            )
        
        employee = process.employee
        
        return {
            'employee_info': {
                'name': encryption_util.decrypt(employee.name_encrypted) if employee.name_encrypted else '',
                'employee_number': employee.employee_number,
                'department': employee.department.name if employee.department else '',
                'position': employee.position,
                'hire_date': employee.hire_date
            },
            'form_fields': [
                {'field': 'phone', 'label': '手机号码', 'type': 'text', 'required': True},
                {'field': 'email', 'label': '邮箱地址', 'type': 'email', 'required': True},
                {'field': 'id_card', 'label': '身份证号', 'type': 'text', 'required': True},
                {'field': 'birth_date', 'label': '出生日期', 'type': 'date', 'required': True},
                {'field': 'gender', 'label': '性别', 'type': 'select', 'required': True},
                {'field': 'address', 'label': '家庭住址', 'type': 'textarea', 'required': False}
            ]
        }
    
    async def submit_onboarding_form(self, token: str, data: dict) -> None:
        """提交入职登记表"""
        process = self.db.query(OnboardingProcess).filter(
            OnboardingProcess.form_token == token
        ).first()
        
        if not process:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="表单不存在或已过期"
            )
        
        # 更新员工信息
        employee = process.employee
        
        # 更新基本信息
        if 'email' in data:
            employee.email = data['email']
        if 'gender' in data:
            employee.gender = data['gender']
        if 'address' in data:
            employee.address = data['address']
        if 'birth_date' in data:
            employee.birth_date = data['birth_date']
        
        # 加密敏感信息
        if 'phone' in data:
            employee.phone_encrypted = encryption_util.encrypt(data['phone'])
        if 'id_card' in data:
            employee.id_card_encrypted = encryption_util.encrypt(data['id_card'])
        
        employee.data_complete = True
        employee.status = 'completed'
        
        # 更新流程状态
        process.process_status = 'completed'
        process.completed_time = datetime.now()
        
        self.db.commit()
```

## 6. 定时任务

```python
# src/jobs/onboarding_job.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from src.database import SessionLocal
from src.models.employee import Employee
from src.services.onboarding_service import OnboardingService

class OnboardingJob:
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
