/**
 * Login Page - User authentication
 */
import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Divider } from 'antd';
import { UserOutlined, LockOutlined, DingdingOutlined, WechatOutlined } from '@ant-design/icons';
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
      message.success('登录成功！');
      navigate('/dashboard');
    } catch (error: any) {
      message.error(error.response?.data?.message || '登录失败，请重试。');
    } finally {
      setLoading(false);
    }
  };

  const handleDingTalkLogin = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/dingtalk/login-url');
      const data = await response.json();
      if (data.success && data.data.loginUrl) {
        window.location.href = data.data.loginUrl;
      } else {
        message.error('Failed to get DingTalk login URL');
      }
    } catch (error) {
      message.error('Failed to initiate DingTalk login');
    } finally {
      setLoading(false);
    }
  };

  const handleWeChatLogin = () => {
    message.info('微信 OAuth 集成即将推出');
    // TODO: Implement WeChat OAuth flow
    // window.location.href = WECHAT_OAUTH_URL;
  };

  return (
    <div className="login-container">
      <Card className="login-card" title="越祥生物科技人事管理平台">
        <Form name="login" onFinish={onFinish} size="large" autoComplete="off">
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名！' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码！' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>

        <Divider>或</Divider>

        <Button
          icon={<DingdingOutlined />}
          onClick={handleDingTalkLogin}
          block
          size="large"
        >
          使用钉钉登录
        </Button>

        <Button
          icon={<WechatOutlined />}
          onClick={handleWeChatLogin}
          block
          size="large"
          style={{ marginTop: 12, backgroundColor: '#07C160', borderColor: '#07C160', color: '#fff' }}
        >
          使用微信登录
        </Button>

        <div style={{ textAlign: 'center', marginTop: 24, color: '#999' }}>
          <small>演示环境，可使用任意用户名/密码登录</small>
        </div>
      </Card>
    </div>
  );
};

export default Login;
