# 前端开发指南

## 1. 技术栈

### 1.1 核心框架
- **React 18.x**: 前端UI框架
- **TypeScript 5.x**: 类型安全的JavaScript
- **Vite 4.x**: 构建工具
- **React Router 6.x**: 路由管理

### 1.2 UI组件库
- **Ant Design 5.x**: 企业级UI组件库
- **Ant Design Pro**: 企业级中后台前端/设计解决方案
- **@ant-design/icons**: 图标库
- **@ant-design/pro-components**: 高级组件

### 1.3 状态管理
- **Redux Toolkit**: 现代化Redux工具包
- **RTK Query**: 数据获取和缓存解决方案
- **React Query**: 服务端状态管理 (可选)

### 1.4 开发工具
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **Husky**: Git hooks
- **lint-staged**: 提交前代码检查

## 2. 项目结构

```
frontend/
├── public/                 # 静态资源
├── src/
│   ├── components/         # 通用组件
│   │   ├── Common/        # 基础组件
│   │   ├── Business/      # 业务组件
│   │   └── Layout/        # 布局组件
│   ├── pages/             # 页面组件
│   │   ├── Login/         # 登录页面
│   │   ├── Dashboard/     # 仪表盘
│   │   ├── Employee/      # 员工管理
│   │   ├── Onboarding/    # 入职管理
│   │   ├── Reports/       # 报表页面
│   │   └── Profile/       # 个人中心
│   ├── hooks/             # 自定义Hooks
│   ├── store/             # 状态管理
│   ├── services/          # API服务
│   ├── utils/             # 工具函数
│   ├── types/             # TypeScript类型定义
│   ├── constants/         # 常量定义
│   ├── styles/            # 全局样式
│   ├── assets/            # 资源文件
│   ├── App.tsx            # 根组件
│   └── main.tsx           # 入口文件
├── package.json
├── vite.config.ts         # Vite配置
├── tsconfig.json          # TypeScript配置
└── .eslintrc.js           # ESLint配置
```

## 3. 环境搭建

### 3.1 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0 或 yarn >= 1.22.0
- Git

### 3.2 项目初始化
```bash
# 创建项目
npm create vite@latest hrsystem-frontend --template react-ts
cd hrsystem-frontend

# 安装依赖
npm install

# 安装UI组件库
npm install antd @ant-design/icons @ant-design/pro-components

# 安装状态管理
npm install @reduxjs/toolkit react-redux

# 安装工具库
npm install axios dayjs lodash-es
npm install -D @types/lodash-es

# 安装开发工具
npm install -D eslint prettier husky lint-staged
```

### 3.3 项目配置

#### Vite配置 (vite.config.ts)
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
```

#### TypeScript配置 (tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## 4. 核心功能实现

### 4.1 路由配置
```typescript
// src/router/index.tsx
import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from '@/components/Layout/BasicLayout';
import { Spin } from 'antd';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const EmployeeList = lazy(() => import('@/pages/Employee/List'));
const EmployeeDetail = lazy(() => import('@/pages/Employee/Detail'));
const OnboardingForm = lazy(() => import('@/pages/Onboarding/Form'));

const LazyWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: '20%' }} />}>
    {children}
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LazyWrapper><Login /></LazyWrapper>,
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <LazyWrapper><Dashboard /></LazyWrapper>,
      },
      {
        path: '/employees',
        element: <LazyWrapper><EmployeeList /></LazyWrapper>,
      },
      {
        path: '/employees/:id',
        element: <LazyWrapper><EmployeeDetail /></LazyWrapper>,
      },
      {
        path: '/onboarding/form/:token',
        element: <LazyWrapper><OnboardingForm /></LazyWrapper>,
      },
    ],
  },
]);
```

### 4.2 状态管理
```typescript
// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { authApi } from '@/services/auth';
import { employeeApi } from '@/services/employee';
import authSlice from './slices/authSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    [authApi.reducerPath]: authApi.reducer,
    [employeeApi.reducerPath]: employeeApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      employeeApi.middleware,
    ),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

```typescript
// src/store/slices/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  token: string | null;
  userInfo: {
    userId: string;
    name: string;
    role: string;
    permissions: string[];
  } | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  token: localStorage.getItem('token'),
  userInfo: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ token: string; userInfo: any }>) => {
      state.token = action.payload.token;
      state.userInfo = action.payload.userInfo;
      state.isAuthenticated = true;
      localStorage.setItem('token', action.payload.token);
    },
    logout: (state) => {
      state.token = null;
      state.userInfo = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
```

### 4.3 API服务
```typescript
// src/services/base.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '@/store';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Employee', 'Department', 'User', 'Document'],
  endpoints: () => ({}),
});
```

```typescript
// src/services/employee.ts
import { baseApi } from './base';

export interface Employee {
  employee_id: string;
  employee_number: string;
  name: string;
  name_en?: string;
  gender: 'male' | 'female';
  phone?: string;  // 可能被脱敏
  email?: string;
  hire_date: string;
  employment_status: 'pending' | 'probation' | 'regular' | 'resigned' | 'terminated';
  department_name?: string;
  position_name?: string;
  data_complete: boolean;
  created_at: string;
}

export interface EmployeeCreateRequest {
  employee_number: string;
  name: string;
  name_en?: string;
  gender: 'male' | 'female';
  birth_date?: string;
  id_card?: string;
  phone?: string;
  email?: string;
  bank_card?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  address?: string;
  hire_date: string;
  probation_end_date?: string;
  department_id: string;
  position_id: string;
  manager_id?: string;
  work_location?: string;
  employment_type?: 'full_time' | 'part_time' | 'intern' | 'contractor';
  remarks?: string;
}

export interface EmployeeListResponse {
  employees: Employee[];
  total: number;
  skip: number;
  limit: number;
}

export interface FileUploadResponse {
  success: boolean;
  message?: string;
  file_url?: string;
}

export const employeeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEmployees: builder.query<EmployeeListResponse, {
      skip?: number;
      limit?: number;
    }>({
      query: (params) => ({
        url: '/employees',
        params,
      }),
      providesTags: ['Employee'],
    }),
    
    createEmployee: builder.mutation<Employee, EmployeeCreateRequest>({
      query: (body) => ({
        url: '/employees',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Employee'],
    }),
    
    updateEmployee: builder.mutation<Employee, { employee_id: string; data: Partial<EmployeeCreateRequest> }>({
      query: ({ employee_id, data }) => ({
        url: `/employees/${employee_id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Employee'],
    }),
    
    deleteEmployee: builder.mutation<void, string>({
      query: (employee_id) => ({
        url: `/employees/${employee_id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Employee'],
    }),
    
    uploadIdCard: builder.mutation<FileUploadResponse, {
      employee_id: string;
      file: File;
      file_type: 'front' | 'back';
    }>({
      query: ({ employee_id, file, file_type }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('file_type', file_type);
        return {
          url: `/employees/${employee_id}/id-card`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Employee', 'Document'],
    }),
    
    importEmployees: builder.mutation<{
      total_count: number;
      success_count: number;
      fail_count: number;
      fail_list: Array<{ row: number; name: string; error: string }>;
    }, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: '/employees/import',
          method: 'POST',
          body: formData,
        };
      },
      }),
      invalidatesTags: ['Employee'],
    }),
  }),
});

export const {
  useGetEmployeesQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useImportEmployeesMutation,
} = employeeApi;
```

### 4.4 权限控制
```typescript
// src/components/Auth/PermissionGuard.tsx
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

interface PermissionGuardProps {
  permissions: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permissions,
  children,
  fallback
}) => {
  const userPermissions = useSelector((state: RootState) => 
    state.auth.userInfo?.permissions || []
  );
  const navigate = useNavigate();

  const hasPermission = permissions.some(permission => 
    userPermissions.includes(permission)
  );

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <Result
        status="403"
        title="403"
        subTitle="抱歉，您没有访问此页面的权限。"
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            返回首页
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
};
```

## 5. 页面开发

### 5.1 员工列表页面
```typescript
// src/pages/Employee/List.tsx
import React, { useState } from 'react';
import { Table, Button, Space, Input, Select, Modal, message } from 'antd';
import { PlusOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { useGetEmployeesQuery, useDeleteEmployeeMutation, useImportEmployeesMutation } from '@/services/employee';
import { PermissionGuard } from '@/components/Auth/PermissionGuard';

const EmployeeList: React.FC = () => {
  const [params, setParams] = useState({ page: 1, size: 10 });
  const { data, isLoading, refetch } = useGetEmployeesQuery(params);
  const [deleteEmployee] = useDeleteEmployeeMutation();
  const [importEmployees] = useImportEmployeesMutation();

  const columns = [
    {
      title: '工号',
      dataIndex: 'employeeNumber',
      key: 'employeeNumber',
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => {
        // 脱敏显示
        return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
      },
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: '职位',
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap = {
          active: { text: '在职', color: 'success' },
          inactive: { text: '离职', color: 'default' },
          pending: { text: '待完善', color: 'warning' },
        };
        return <Badge status={statusMap[status]?.color} text={statusMap[status]?.text} />;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Employee) => (
        <Space size="middle">
          <Button type="link" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" danger onClick={() => handleDelete(record.employeeId)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个员工吗？',
      onOk: async () => {
        try {
          await deleteEmployee(id).unwrap();
          message.success('删除成功');
          refetch();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleImport = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const result = await importEmployees(formData).unwrap();
      message.success(`导入成功：${result.successCount}条，失败：${result.failCount}条`);
      refetch();
    } catch (error) {
      message.error('导入失败');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Input.Search
            placeholder="搜索员工姓名或工号"
            onSearch={(value) => setParams({ ...params, keyword: value, page: 1 })}
            style={{ width: 200 }}
          />
          <Select
            placeholder="选择部门"
            style={{ width: 120 }}
            allowClear
            onChange={(value) => setParams({ ...params, department: value, page: 1 })}
          >
            <Select.Option value="技术部">技术部</Select.Option>
            <Select.Option value="产品部">产品部</Select.Option>
          </Select>
          <PermissionGuard permissions={['employee:create']}>
            <Button type="primary" icon={<PlusOutlined />}>
              新增员工
            </Button>
          </PermissionGuard>
          <PermissionGuard permissions={['employee:import']}>
            <Button icon={<UploadOutlined />} onClick={() => {/* 打开导入弹窗 */}}>
              批量导入
            </Button>
          </PermissionGuard>
        </Space>
      </div>
      
      <Table
        columns={columns}
        dataSource={data?.list}
        loading={isLoading}
        pagination={{
          current: params.page,
          pageSize: params.size,
          total: data?.total,
          showSizeChanger: true,
          showQuickJumper: true,
          onChange: (page, size) => setParams({ ...params, page, size }),
        }}
        rowKey="employeeId"
      />
    </div>
  );
};

export default EmployeeList;
```

### 5.2 入职登记表页面
```typescript
// src/pages/Onboarding/Form.tsx
import React, { useEffect } from 'react';
import { Form, Input, DatePicker, Select, Button, Card, message, Upload } from 'antd';
import { useParams } from 'react-router-dom';
import { useGetOnboardingFormQuery, useSubmitOnboardingFormMutation } from '@/services/onboarding';

const OnboardingForm: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [form] = Form.useForm();
  
  const { data, isLoading } = useGetOnboardingFormQuery(token || '');
  const [submitForm, { isLoading: isSubmitting }] = useSubmitOnboardingFormMutation();

  useEffect(() => {
    if (data?.employeeInfo) {
      form.setFieldsValue(data.employeeInfo);
    }
  }, [data, form]);

  const onFinish = async (values: any) => {
    try {
      await submitForm({ token: token || '', data: values }).unwrap();
      message.success('信息提交成功！');
      // 跳转到成功页面
    } catch (error) {
      message.error('提交失败，请重试');
    }
  };

  if (isLoading) {
    return <div>加载中...</div>;
  }

  return (
    <Card title="员工信息登记表" style={{ maxWidth: 600, margin: '0 auto' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        autoComplete="off"
      >
        <Form.Item label="姓名" name="name">
          <Input disabled />
        </Form.Item>
        
        <Form.Item label="工号" name="employeeNumber">
          <Input disabled />
        </Form.Item>
        
        <Form.Item
          label="手机号"
          name="phone"
          rules={[
            { required: true, message: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }
          ]}
        >
          <Input placeholder="请输入手机号" />
        </Form.Item>
        
        <Form.Item
          label="身份证号"
          name="idCard"
          rules={[
            { required: true, message: '请输入身份证号' },
            { pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/, message: '身份证号格式不正确' }
          ]}
        >
          <Input placeholder="请输入身份证号" />
        </Form.Item>
        
        <Form.Item
          label="出生日期"
          name="birthDate"
          rules={[{ required: true, message: '请选择出生日期' }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        
        <Form.Item
          label="性别"
          name="gender"
          rules={[{ required: true, message: '请选择性别' }]}
        >
          <Select placeholder="请选择性别">
            <Select.Option value="male">男</Select.Option>
            <Select.Option value="female">女</Select.Option>
          </Select>
        </Form.Item>
        
        <Form.Item label="身份证复印件" name="idCardFile">
          <Upload
            listType="picture-card"
            maxCount={1}
            beforeUpload={() => false}
          >
            上传身份证复印件
          </Upload>
        </Form.Item>
        
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isSubmitting} block>
            提交信息
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default OnboardingForm;
```

## 6. 开发规范

### 6.1 代码规范
- 使用TypeScript进行类型安全开发
- 遵循ESLint和Prettier配置
- 组件名使用PascalCase
- 文件名使用kebab-case
- 常量使用UPPER_SNAKE_CASE

### 6.2 组件规范
- 使用函数组件和Hooks
- Props接口定义明确的类型
- 合理使用React.memo优化性能
- 避免在组件内定义复杂对象

### 6.3 样式规范
- 优先使用Ant Design组件样式
- 自定义样式使用CSS Modules或styled-components
- 避免内联样式
- 响应式设计考虑移动端适配

## 7. 性能优化

### 7.1 代码分割
- 路由级别的懒加载
- 组件级别的动态导入
- 第三方库的按需引入

### 7.2 缓存策略
- RTK Query数据缓存
- 图片资源懒加载
- 列表数据虚拟滚动

### 7.3 打包优化
- Vite构建优化
- Bundle分析和优化
- 静态资源CDN部署

## 8. 测试策略

### 8.1 单元测试
```typescript
// src/__tests__/components/EmployeeList.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import EmployeeList from '@/pages/Employee/List';

describe('EmployeeList', () => {
  it('renders employee list correctly', () => {
    render(
      <Provider store={store}>
        <EmployeeList />
      </Provider>
    );
    
    expect(screen.getByText('新增员工')).toBeInTheDocument();
  });
});
```

### 8.2 E2E测试
- 使用Playwright进行端到端测试
- 覆盖关键业务流程
- 自动化测试集成到CI/CD

## 9. 部署指南

### 9.1 构建命令
```bash
# 开发环境
npm run dev

# 生产构建
npm run build

# 预览构建结果
npm run preview
```

### 9.2 Docker部署
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
