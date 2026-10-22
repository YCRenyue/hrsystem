/**
 * Login Page - User authentication
 */
import React, { useState } from 'react';
import { Form, Input, Button, Card, App } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const loggedInUser = await login(values.username, values.password);
      message.success('登录成功！');
      if (loggedInUser.must_change_password) {
        navigate('/change-password');
        return;
      }
      const isManager = ['admin', 'hr_admin', 'department_manager']
        .includes(loggedInUser?.role);
      navigate(isManager ? '/dashboard' : '/self-service');
    } catch (error: any) {
      message.error(error.response?.data?.message || '登录失败，请重试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card" title="仁越生物科技人事管理平台">
        <Form name="login" onFinish={onFinish} size="large" autoComplete="on">
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名！' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" autoComplete='username' />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码！' }]}

          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" autoComplete='current-password' />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
