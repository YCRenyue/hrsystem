/**
 * DingTalk OAuth Callback Page
 * Handles the callback from DingTalk OAuth login
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin, Result, Button } from 'antd';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const DingTalkCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      setError('No authorization code received');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/dingtalk/callback', {
        code,
        state
      });

      if (response.data.success) {
        const { token, user } = response.data.data;
        login(user, token);
        navigate('/dashboard');
      } else {
        setError('Login failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <Spin size="large" tip="Processing DingTalk login..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '50px' }}>
        <Result
          status="error"
          title="Login Failed"
          subTitle={error}
          extra={
            <Button type="primary" onClick={() => navigate('/login')}>
              Back to Login
            </Button>
          }
        />
      </div>
    );
  }

  return null;
};

export default DingTalkCallback;
