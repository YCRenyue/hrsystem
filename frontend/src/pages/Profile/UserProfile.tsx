/**
 * User Profile Page
 * Displays and allows editing of current user's profile information
 */
import { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Button,
  Form,
  Input,
  message,
  Spin,
  Avatar,
  Row,
  Col,
  Divider,
  Modal,
  Space,
} from 'antd';
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  UserOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface UserProfileData {
  user: {
    username: string;
    email: string;
    role: string;
    display_name?: string;
  };
  employee?: {
    employee_number: string;
    name: string;
    phone: string;
    email: string;
    department?: {
      name: string;
    };
    position?: string;
    entry_date?: string;
    emergency_contact?: string;
    emergency_phone?: string;
    address?: string;
  };
}

const UserProfile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users/profile');
      if (response.data.success) {
        setProfileData(response.data.data);
        form.setFieldsValue({
          email: response.data.data.employee?.email,
          emergency_contact: response.data.data.employee?.emergency_contact,
          emergency_phone: response.data.data.employee?.emergency_phone,
          address: response.data.data.employee?.address,
        });
      }
    } catch (error) {
      message.error('加载个人信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const response = await api.put('/users/profile', values);
      if (response.data.success) {
        message.success('个人信息更新成功');
        setEditing(false);
        fetchProfileData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '更新个人信息失败');
    }
  };

  const handleCancel = () => {
    setEditing(false);
    form.resetFields();
  };

  const handleChangePassword = async () => {
    try {
      const values = await passwordForm.validateFields();
      const response = await api.post('/users/change-password', values);
      if (response.data.success) {
        message.success('密码修改成功');
        setPasswordModalVisible(false);
        passwordForm.resetFields();
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '修改密码失败');
    }
  };

  const getRoleLabel = (role: string) => {
    const roleMap: { [key: string]: string } = {
      admin: '系统管理员',
      hr_admin: 'HR管理员',
      department_manager: '部门经理',
      employee: '员工',
    };
    return roleMap[role] || role;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!profileData) {
    return <div>暂无个人信息</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Profile Header */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={24} align="middle">
          <Col>
            <Avatar
              size={80}
              icon={<UserOutlined />}
              style={{ backgroundColor: '#1890ff' }}
            />
          </Col>
          <Col flex="auto">
            <h2 style={{ margin: 0, fontSize: 24 }}>
              {profileData.employee?.name || profileData.user.username}
            </h2>
            <p style={{ margin: '8px 0 0', color: '#666', fontSize: 14 }}>
              {profileData.employee?.position || getRoleLabel(profileData.user.role)}
              {profileData.employee?.department && (
                <> · {profileData.employee.department.name}</>
              )}
            </p>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<LockOutlined />}
                onClick={() => setPasswordModalVisible(true)}
              >
                修改密码
              </Button>
              {!editing ? (
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => setEditing(true)}
                >
                  编辑信息
                </Button>
              ) : (
                <>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                  >
                    保存
                  </Button>
                  <Button icon={<CloseOutlined />} onClick={handleCancel}>
                    取消
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Account Information */}
      <Card title="账户信息" style={{ marginBottom: 24 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="用户名">
            {profileData.user.username}
          </Descriptions.Item>
          <Descriptions.Item label="角色">
            {getRoleLabel(profileData.user.role)}
          </Descriptions.Item>
          <Descriptions.Item label="工号" span={2}>
            {profileData.employee?.employee_number || '未关联员工'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Employee Information */}
      {profileData.employee && (
        <Card title="员工信息">
          {!editing ? (
            <Descriptions bordered column={2}>
              <Descriptions.Item label="姓名">
                {profileData.employee.name}
              </Descriptions.Item>
              <Descriptions.Item label="部门">
                {profileData.employee.department?.name || '未分配'}
              </Descriptions.Item>
              <Descriptions.Item label="职位">
                {profileData.employee.position || '未设置'}
              </Descriptions.Item>
              <Descriptions.Item label="入职日期">
                {profileData.employee.entry_date || '未设置'}
              </Descriptions.Item>
              <Descriptions.Item label="手机号码">
                {profileData.employee.phone}
              </Descriptions.Item>
              <Descriptions.Item label="邮箱">
                {profileData.employee.email || '未设置'}
              </Descriptions.Item>
              <Descriptions.Item label="紧急联系人">
                {profileData.employee.emergency_contact || '未设置'}
              </Descriptions.Item>
              <Descriptions.Item label="紧急联系电话">
                {profileData.employee.emergency_phone || '未设置'}
              </Descriptions.Item>
              <Descriptions.Item label="家庭地址" span={2}>
                {profileData.employee.address || '未设置'}
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="email"
                    label="邮箱"
                    rules={[
                      { type: 'email', message: '请输入有效的邮箱地址' },
                    ]}
                  >
                    <Input placeholder="请输入邮箱" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="emergency_contact" label="紧急联系人">
                    <Input placeholder="请输入紧急联系人姓名" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="emergency_phone"
                    label="紧急联系电话"
                    rules={[
                      {
                        pattern: /^1[3-9]\d{9}$/,
                        message: '请输入有效的手机号码',
                      },
                    ]}
                  >
                    <Input placeholder="请输入紧急联系电话" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="address" label="家庭地址">
                <Input.TextArea
                  rows={3}
                  placeholder="请输入家庭地址"
                  maxLength={200}
                  showCount
                />
              </Form.Item>

              <Divider />
              <div style={{ color: '#666', fontSize: 12 }}>
                注：姓名、工号、部门、职位、入职日期等信息为只读，如需修改请联系HR管理员。
              </div>
            </Form>
          )}
        </Card>
      )}

      {/* Change Password Modal */}
      <Modal
        title="修改密码"
        open={passwordModalVisible}
        onOk={handleChangePassword}
        onCancel={() => {
          setPasswordModalVisible(false);
          passwordForm.resetFields();
        }}
        okText="确认修改"
        cancelText="取消"
      >
        <Form form={passwordForm} layout="vertical">
          <Form.Item
            name="currentPassword"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入当前密码"
            />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度至少为6位' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入新密码（至少6位）"
            />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请再次输入新密码"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserProfile;
