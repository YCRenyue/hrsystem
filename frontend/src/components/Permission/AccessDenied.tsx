/**
 * AccessDenied Component
 *
 * 权限不足页面
 */

import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { LockOutlined } from '@ant-design/icons';

export const AccessDenied: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      backgroundColor: '#f0f2f5'
    }}>
      <Result
        status="403"
        icon={<LockOutlined style={{ color: '#ff4d4f' }} />}
        title="访问被拒绝"
        subTitle="抱歉，您没有权限访问此页面。"
        extra={[
          <Button type="primary" key="home" onClick={() => navigate('/')}>
            返回首页
          </Button>,
          <Button key="back" onClick={() => navigate(-1)}>
            返回上一页
          </Button>
        ]}
      />
    </div>
  );
};

export default AccessDenied;
