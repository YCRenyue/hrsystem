/**
 * Main Layout - Layout wrapper with navigation and header
 */
import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, theme } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  DashboardOutlined,
  LogoutOutlined,
  SettingOutlined,
  ApartmentOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  CalendarOutlined,
  SafetyOutlined,
  CarOutlined,
  CoffeeOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // User dropdown menu
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
      danger: true,
    },
  ];

  // Sidebar navigation menu
  const sidebarMenuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '系统概览',
      onClick: () => navigate('/dashboard'),
    },
    {
      key: '/employees',
      icon: <TeamOutlined />,
      label: '员工管理',
      onClick: () => navigate('/employees'),
    },
    {
      key: '/departments',
      icon: <ApartmentOutlined />,
      label: '部门管理',
      onClick: () => navigate('/departments'),
    },
    {
      key: '/attendance',
      icon: <ClockCircleOutlined />,
      label: '考勤管理',
      onClick: () => navigate('/attendance'),
    },
    {
      key: '/leaves',
      icon: <FileTextOutlined />,
      label: '请假管理',
      onClick: () => navigate('/leaves'),
    },
    {
      key: '/annual-leave',
      icon: <CalendarOutlined />,
      label: '年假管理',
      onClick: () => navigate('/annual-leave'),
    },
    {
      key: '/social-security',
      icon: <SafetyOutlined />,
      label: '社保管理',
      onClick: () => navigate('/social-security'),
    },
    {
      key: '/business-trips',
      icon: <CarOutlined />,
      label: '出差管理',
      onClick: () => navigate('/business-trips'),
    },
    {
      key: '/canteen-meals',
      icon: <CoffeeOutlined />,
      label: '食堂餐费',
      onClick: () => navigate('/canteen-meals'),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: collapsed ? 16 : 20,
            fontWeight: 'bold',
          }}
        >
          {collapsed ? '越祥' : '越祥生物科技'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={sidebarMenuItems}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 500 }}>
            {location.pathname === '/dashboard' && '系统概览'}
            {location.pathname === '/employees' && '员工管理'}
            {location.pathname === '/departments' && '部门管理'}
            {location.pathname === '/attendance' && '考勤管理'}
            {location.pathname === '/leaves' && '请假管理'}
            {location.pathname === '/annual-leave' && '年假管理'}
            {location.pathname === '/social-security' && '社保管理'}
            {location.pathname === '/business-trips' && '出差管理'}
            {location.pathname === '/canteen-meals' && '食堂餐费'}
            {location.pathname === '/profile' && '个人资料'}
            {location.pathname === '/settings' && '用户设置'}
          </div>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
              <span>{user?.username || '用户'}</span>
            </div>
          </Dropdown>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
