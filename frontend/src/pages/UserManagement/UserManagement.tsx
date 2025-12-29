/**
 * User Management Page - Admin user management
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Select,
  Switch,
  Card,
  App,
  Tag,
  Input,
  Tooltip,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { userService, UserProfile, UpdateUserRoleData } from '../../services/userService';

const { Option } = Select;

const roleLabels: Record<string, { label: string; color: string }> = {
  admin: { label: '超级管理员', color: 'red' },
  hr_admin: { label: 'HR管理员', color: 'orange' },
  department_manager: { label: '部门经理', color: 'blue' },
  employee: { label: '普通员工', color: 'default' },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: '正常', color: 'green' },
  inactive: { label: '禁用', color: 'default' },
  locked: { label: '锁定', color: 'red' },
};

const dataScopeLabels: Record<string, string> = {
  all: '全部数据',
  department: '本部门',
  self: '仅自己',
};

const UserManagement: React.FC = () => {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userService.getUsers({
        page: currentPage,
        size: pageSize,
        keyword: keyword || undefined,
        role: roleFilter,
        status: statusFilter,
      });
      setUsers(data.items);
      setTotal(data.total);
    } catch (error) {
      message.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, keyword, roleFilter, statusFilter, message]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleTableChange = (paginationConfig: TablePaginationConfig) => {
    setCurrentPage(paginationConfig.current || 1);
    setPageSize(paginationConfig.pageSize || 10);
  };

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handleReset = () => {
    setKeyword('');
    setRoleFilter(undefined);
    setStatusFilter(undefined);
    setCurrentPage(1);
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    form.setFieldsValue({
      role: user.role,
      data_scope: user.data_scope,
      can_view_sensitive: user.can_view_sensitive,
      status: user.status,
    });
    setModalVisible(true);
  };

  const handleResetPassword = (user: UserProfile) => {
    modal.confirm({
      title: '重置密码确认',
      content: `确定要将用户 "${user.username}" 的密码重置为默认密码 "123456" 吗?`,
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await userService.resetUserPassword(user.user_id);
          message.success(result.message || 'Password reset successful');
          fetchUsers();
        } catch (error) {
          message.error('Failed to reset password');
        }
      },
    });
  };

  const handleDelete = (user: UserProfile) => {
    modal.confirm({
      title: '删除用户确认',
      content: `确定要删除用户 "${user.username}" 吗? 此操作不可恢复。`,
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await userService.deleteUser(user.user_id);
          message.success('User deleted successfully');
          fetchUsers();
        } catch (error) {
          message.error('Failed to delete user');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingUser) {
        const updateData: UpdateUserRoleData = {
          role: values.role,
          data_scope: values.data_scope,
          can_view_sensitive: values.can_view_sensitive,
          status: values.status,
        };

        await userService.updateUserRole(editingUser.user_id, updateData);
        message.success('User updated successfully');
      }

      setModalVisible(false);
      fetchUsers();
    } catch (error) {
      message.error('Failed to save user');
    }
  };

  const columns: ColumnsType<UserProfile> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
    },
    {
      title: '显示名称',
      dataIndex: 'display_name',
      key: 'display_name',
      width: 120,
      render: (text: string) => text || '-',
    },
    {
      title: '员工信息',
      key: 'employee',
      width: 200,
      render: (_, record) => {
        if (!record.employee) return '-';
        return (
          <div>
            <div>{record.employee.employee_number}</div>
            <div style={{ fontSize: 12, color: '#999' }}>
              {record.employee.department?.name || '-'}
            </div>
          </div>
        );
      },
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string) => {
        const roleInfo = roleLabels[role] || { label: role, color: 'default' };
        return <Tag color={roleInfo.color}>{roleInfo.label}</Tag>;
      },
    },
    {
      title: '数据范围',
      dataIndex: 'data_scope',
      key: 'data_scope',
      width: 100,
      render: (scope: string) => dataScopeLabels[scope] || scope,
    },
    {
      title: '敏感数据',
      dataIndex: 'can_view_sensitive',
      key: 'can_view_sensitive',
      width: 90,
      render: (value: boolean) => (
        <Tag color={value ? 'green' : 'default'}>{value ? '可查看' : '不可查看'}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => {
        const statusInfo = statusLabels[status] || { label: status, color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>;
      },
    },
    {
      title: '最后登录',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      width: 160,
      render: (date: string) => (date ? new Date(date).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit permissions">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          </Tooltip>
          <Tooltip title="Reset password">
            <Button
              type="link"
              icon={<KeyOutlined />}
              onClick={() => handleResetPassword(record)}
            >
              重置密码
            </Button>
          </Tooltip>
          <Tooltip title="Delete user">
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            >
              删除
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title="用户管理">
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="Search username/name/email"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 200 }}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="Filter by role"
            value={roleFilter}
            onChange={setRoleFilter}
            allowClear
            style={{ width: 150 }}
          >
            <Option value="admin">超级管理员</Option>
            <Option value="hr_admin">HR管理员</Option>
            <Option value="department_manager">部门经理</Option>
            <Option value="employee">普通员工</Option>
          </Select>
          <Select
            placeholder="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
            style={{ width: 120 }}
          >
            <Option value="active">正常</Option>
            <Option value="inactive">禁用</Option>
            <Option value="locked">锁定</Option>
          </Select>
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={users}
          rowKey="user_id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 个用户`,
            pageSizeOptions: ['10', '20', '50'],
          }}
          onChange={handleTableChange}
        />
      </Card>

      <Modal
        title="编辑用户权限"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: 'Please select a role' }]}
          >
            <Select placeholder="Select role">
              <Option value="admin">超级管理员</Option>
              <Option value="hr_admin">HR管理员</Option>
              <Option value="department_manager">部门经理</Option>
              <Option value="employee">普通员工</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="数据访问范围"
            name="data_scope"
            rules={[{ required: true, message: 'Please select data scope' }]}
          >
            <Select placeholder="Select data scope">
              <Option value="all">全部数据</Option>
              <Option value="department">本部门</Option>
              <Option value="self">仅自己</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="可查看敏感数据"
            name="can_view_sensitive"
            valuePropName="checked"
          >
            <Switch checkedChildren="Yes" unCheckedChildren="No" />
          </Form.Item>
          <Form.Item
            label="账户状态"
            name="status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select placeholder="Select status">
              <Option value="active">正常</Option>
              <Option value="inactive">禁用</Option>
              <Option value="locked">锁定</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
