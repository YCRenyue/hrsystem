/**
 * Login Page - User authentication
 */
import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Divider } from 'antd';
import { UserOutlined, LockOutlined, DingdingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success('Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDingTalkLogin = () => {
    message.info('DingTalk OAuth integration coming soon');
    // TODO: Implement DingTalk OAuth flow
    // window.location.href = DINGTALK_OAUTH_URL;
  };

  return (
    <div className="login-container">
      <Card className="login-card" title="HR Management System">
        <Form name="login" onFinish={onFinish} size="large" autoComplete="off">
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please input your username!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Username" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Login
            </Button>
          </Form.Item>
        </Form>

        <Divider>OR</Divider>

        <Button
          icon={<DingdingOutlined />}
          onClick={handleDingTalkLogin}
          block
          size="large"
        >
          Login with DingTalk
        </Button>

        <div style={{ textAlign: 'center', marginTop: 24, color: '#999' }}>
          <small>For demo purposes, use any username/password</small>
        </div>
      </Card>
    </div>
  );
};

export default Login;
