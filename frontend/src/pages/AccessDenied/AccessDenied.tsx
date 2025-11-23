/**
 * Access Denied Page
 *
 * 无权限访问提示页面
 * 当用户尝试访问没有权限的页面时显示
 */

import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { LockOutlined } from '@ant-design/icons';
import { usePermission } from '../../hooks/usePermission';

const AccessDenied: React.FC = () => {
  const navigate = useNavigate();
  const { role, dataScope } = usePermission();

  /**
   * 返回到合适的页面
   */
  const handleGoBack = () => {
    // 根据用户角色返回到合适的页面
    if (role === 'admin' || role === 'hr_admin') {
      navigate('/dashboard');
    } else if (role === 'department_manager') {
      navigate('/employees'); // 部门经理返回员工列表（会自动过滤）
    } else if (role === 'employee') {
      navigate('/profile'); // 普通员工返回个人信息页
    } else {
      navigate('/');
    }
  };

  /**
   * 返回首页
   */
  const handleGoHome = () => {
    navigate('/');
  };

  // 根据数据范围提供友好的提示
  const getSubTitle = () => {
    if (dataScope === 'self') {
      return '您当前只能查看和管理个人信息。如需访问更多功能，请联系系统管理员。';
    } else if (dataScope === 'department') {
      return '您当前只能查看和管理本部门的信息。如需访问其他部门数据，请联系系统管理员。';
    } else {
      return '您没有权限访问此页面。如需访问，请联系系统管理员。';
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f0f2f5'
    }}>
      <Result
        status="403"
        title="403"
        subTitle={getSubTitle()}
        icon={<LockOutlined style={{ fontSize: 72, color: '#ff4d4f' }} />}
        extra={[
          <Button type="primary" key="back" onClick={handleGoBack}>
            返回
          </Button>,
          <Button key="home" onClick={handleGoHome}>
            返回首页
          </Button>
        ]}
      >
        <div style={{
          marginTop: 24,
          padding: 24,
          background: '#fafafa',
          borderRadius: 8
        }}>
          <h4>权限说明：</h4>
          <ul style={{ textAlign: 'left', paddingLeft: 20 }}>
            <li><strong>系统管理员</strong>：拥有所有系统权限</li>
            <li><strong>HR管理员</strong>：可以管理所有员工信息和入职流程</li>
            <li><strong>部门经理</strong>：可以查看和管理本部门员工信息</li>
            <li><strong>普通员工</strong>：只能查看和编辑个人信息</li>
          </ul>
          {role && (
            <p style={{ marginTop: 16, color: '#666' }}>
              您当前的角色：<strong>{getRoleName(role)}</strong> | 数据范围：<strong>{getDataScopeName(dataScope)}</strong>
            </p>
          )}
        </div>
      </Result>
    </div>
  );
};

/**
 * 获取角色中文名称
 */
const getRoleName = (role: string): string => {
  const roleMap: Record<string, string> = {
    'admin': '系统管理员',
    'hr_admin': 'HR管理员',
    'department_manager': '部门经理',
    'employee': '普通员工'
  };
  return roleMap[role] || role;
};

/**
 * 获取数据范围中文名称
 */
const getDataScopeName = (scope: string): string => {
  const scopeMap: Record<string, string> = {
    'all': '全部数据',
    'department': '本部门数据',
    'self': '仅个人数据'
  };
  return scopeMap[scope] || scope;
};

export default AccessDenied;
