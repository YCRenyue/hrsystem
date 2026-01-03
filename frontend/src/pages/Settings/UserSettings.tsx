/**
 * User Settings Page - Personal settings with sidebar menu
 */
import React, { useState, useEffect } from 'react';
import {
  Layout,
  Menu,
  Card,
  Form,
  Input,
  Button,
  Select,
  ColorPicker,
  Descriptions,
  Space,
  Divider,
  Row,
  Col,
  App
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { userService, UserProfile, UserPreferences, ChangePasswordData } from '../../services/userService';

const { Sider, Content } = Layout;
const { Option } = Select;

type MenuKey = 'profile' | 'password' | 'preferences';

const UserSettings: React.FC = () => {
  const [selectedMenu, setSelectedMenu] = useState<MenuKey>('profile');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>({
    fontSize: 'medium',
    backgroundColor: '#ffffff',
    primaryColor: '#1890ff'
  });

  const [passwordForm] = Form.useForm();
  const [preferencesForm] = Form.useForm();
  const { message } = App.useApp();

  /**
   * Load user profile and preferences
   */
  useEffect(() => {
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserData = async () => {
    try {
      const [profileData, preferencesData] = await Promise.all([
        userService.getProfile(),
        userService.getPreferences()
      ]);
      setProfile(profileData);
      setPreferences(preferencesData);
      preferencesForm.setFieldsValue(preferencesData);

      // Apply theme changes on initial load
      applyThemeChanges(preferencesData);
    } catch (error) {
      console.error('Failed to load user data:', error);
      message.error('加载用户数据失败');
    }
  };

  /**
   * Handle password change
   */
  const handlePasswordChange = async (values: ChangePasswordData) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      await userService.changePassword(values);
      message.success('密码修改成功，请重新登录');
      passwordForm.resetFields();
      // Optionally redirect to login page
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (error: any) {
      message.error(error.response?.data?.message || '密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle preferences update
   */
  const handlePreferencesUpdate = async (values: any) => {
    setLoading(true);
    try {
      const updatedPreferences: UserPreferences = {
        fontSize: values.fontSize,
        backgroundColor: typeof values.backgroundColor === 'string'
          ? values.backgroundColor
          : values.backgroundColor?.toHexString(),
        primaryColor: typeof values.primaryColor === 'string'
          ? values.primaryColor
          : values.primaryColor?.toHexString()
      };

      await userService.updatePreferences(updatedPreferences);
      setPreferences(updatedPreferences);
      message.success('偏好设置已更新');

      // Apply theme changes
      applyThemeChanges(updatedPreferences);
    } catch (error) {
      message.error('更新设置失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Apply theme changes to the document
   */
  const applyThemeChanges = (prefs: UserPreferences) => {
    if (prefs.backgroundColor) {
      document.body.style.backgroundColor = prefs.backgroundColor;
    }

    if (prefs.fontSize) {
      const fontSizeMap: Record<string, string> = {
        small: '12px',
        medium: '14px',
        large: '16px'
      };
      document.documentElement.style.fontSize = fontSizeMap[prefs.fontSize] || '14px';
    }
  };

  /**
   * Get role display text
   */
  const getRoleText = (role: string): string => {
    const roleMap: Record<string, string> = {
      admin: '超级管理员',
      hr_admin: 'HR管理员',
      department_manager: '部门经理',
      employee: '员工'
    };
    return roleMap[role] || role;
  };

  /**
   * Render profile information panel
   */
  const renderProfilePanel = () => (
    <Card title="个人信息" bordered={false}>
      <Descriptions column={1} bordered>
        <Descriptions.Item label="用户名">{profile?.username}</Descriptions.Item>
        <Descriptions.Item label="邮箱">{profile?.email || '-'}</Descriptions.Item>
        <Descriptions.Item label="角色">{getRoleText(profile?.role || '')}</Descriptions.Item>
        <Descriptions.Item label="数据权限">
          {profile?.data_scope === 'all' ? '全部数据' :
           profile?.data_scope === 'department' ? '本部门数据' : '个人数据'}
        </Descriptions.Item>
        {profile?.employee && (
          <>
            <Descriptions.Item label="员工编号">
              {profile.employee.employee_number}
            </Descriptions.Item>
            <Descriptions.Item label="姓名">
              {profile.employee.name_masked || profile.employee.name_encrypted || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="部门">
              {profile.employee.department?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="手机号">
              {profile.employee.phone_masked || '-'}
            </Descriptions.Item>
          </>
        )}
        <Descriptions.Item label="创建时间">
          {profile?.created_at ? new Date(profile.created_at).toLocaleString('zh-CN') : '-'}
        </Descriptions.Item>
      </Descriptions>

      <Divider />

      <div style={{ color: '#666', fontSize: '12px' }}>
        <p>提示：如需修改个人信息，请联系HR管理员</p>
      </div>
    </Card>
  );

  /**
   * Render password change panel
   */
  const renderPasswordPanel = () => (
    <Card title="修改密码" bordered={false}>
      <Form
        form={passwordForm}
        layout="vertical"
        onFinish={handlePasswordChange}
        style={{ maxWidth: '500px' }}
      >
        <Form.Item
          label="当前密码"
          name="currentPassword"
          rules={[
            { required: true, message: '请输入当前密码' },
            { min: 6, message: '密码至少6个字符' }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="请输入当前密码"
            size="large"
          />
        </Form.Item>

        <Form.Item
          label="新密码"
          name="newPassword"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码至少6个字符' },
            {
              pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/,
              message: '密码必须包含大小写字母和数字'
            }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="请输入新密码"
            size="large"
          />
        </Form.Item>

        <Form.Item
          label="确认新密码"
          name="confirmPassword"
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
            size="large"
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<SaveOutlined />}
              size="large"
            >
              修改密码
            </Button>
            <Button onClick={() => passwordForm.resetFields()} size="large">
              重置
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <Divider />

      <div style={{ color: '#666', fontSize: '12px' }}>
        <p><strong>密码要求：</strong></p>
        <ul>
          <li>至少6个字符</li>
          <li>必须包含大写字母、小写字母和数字</li>
          <li>密码修改后需要重新登录</li>
        </ul>
      </div>
    </Card>
  );

  /**
   * Render preferences panel
   */
  const renderPreferencesPanel = () => (
    <Card title="个性化偏好" bordered={false}>
      <Form
        form={preferencesForm}
        layout="vertical"
        onFinish={handlePreferencesUpdate}
        initialValues={preferences}
        style={{ maxWidth: '600px' }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="字体大小"
              name="fontSize"
              tooltip="选择界面字体大小"
            >
              <Select size="large">
                <Option value="small">小号 (12px)</Option>
                <Option value="medium">中号 (14px)</Option>
                <Option value="large">大号 (16px)</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="背景颜色"
              name="backgroundColor"
              tooltip="选择页面背景颜色"
            >
              <ColorPicker
                showText
                size="large"
                format="hex"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="主题色"
              name="primaryColor"
              tooltip="选择主题色"
            >
              <ColorPicker
                showText
                size="large"
                format="hex"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<SaveOutlined />}
              size="large"
            >
              更新设置
            </Button>
            <Button
              onClick={() => {
                preferencesForm.setFieldsValue({
                  fontSize: 'medium',
                  backgroundColor: '#ffffff',
                  primaryColor: '#1890ff'
                });
              }}
              size="large"
            >
              恢复默认
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <Divider />

      <div style={{ color: '#666', fontSize: '12px' }}>
        <p><strong>提示：</strong></p>
        <ul>
          <li>设置更新后立即生效</li>
          <li>颜色修改会影响整体页面视觉体验</li>
        </ul>
      </div>
    </Card>
  );

  /**
   * Menu items configuration
   */
  const menuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息'
    },
    {
      key: 'password',
      icon: <LockOutlined />,
      label: '修改密码'
    }
    // {
    //   key: 'preferences',
    //   icon: <BgColorsOutlined />,
    //   label: '个性化偏好'
    // }
  ];

  /**
   * Render content based on selected menu
   */
  const renderContent = () => {
    switch (selectedMenu) {
      case 'profile':
        return renderProfilePanel();
      case 'password':
        return renderPasswordPanel();
      case 'preferences':
        return renderPreferencesPanel();
      default:
        return renderProfilePanel();
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <h2>用户设置</h2>
      <Layout style={{ background: '#fff', marginTop: '24px' }}>
        <Sider width={240} style={{ background: '#fafafa' }}>
          <Menu
            mode="inline"
            selectedKeys={[selectedMenu]}
            items={menuItems}
            onClick={({ key }) => setSelectedMenu(key as MenuKey)}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        <Layout style={{ padding: '0 24px' }}>
          <Content
            style={{
              padding: 24,
              margin: 0,
              minHeight: 500,
              background: '#fff'
            }}
          >
            {renderContent()}
          </Content>
        </Layout>
      </Layout>
    </div>
  );
};

export default UserSettings;
