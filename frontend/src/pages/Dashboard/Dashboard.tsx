/**
 * Dashboard Page - Overview of HR system
 */
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, App, Spin } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  FileDoneOutlined,
} from '@ant-design/icons';
import { dashboardService, DashboardStats } from '../../services/dashboardService';

const Dashboard: React.FC = () => {
  const { message } = App.useApp();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getStats();
      setStats(data);
    } catch (error) {
      message.error('获取统计数据失败');
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>系统概览</h2>

      {/* 员工统计卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="员工总数"
              value={stats?.totalEmployees || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="部门数量"
              value={stats?.totalDepartments || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待入职"
              value={stats?.pendingEmployees || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="资料完成率"
              value={stats?.completionRate || 0}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 考勤和请假统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="本月出勤率"
              value={stats?.attendanceRate || 0}
              suffix="%"
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待审批请假"
              value={stats?.pendingLeaves || 0}
              prefix={<FileDoneOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="本月请假总数"
              value={stats?.totalLeaves || 0}
              prefix={<FileDoneOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="部门员工分布">
            {stats?.employeesByDepartment && stats.employeesByDepartment.length > 0 ? (
              <div>
                {stats.employeesByDepartment.map((dept, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: index < stats.employeesByDepartment.length - 1 ? '1px solid #f0f0f0' : 'none'
                    }}
                  >
                    <span>{dept['department.name'] || '未分配'}</span>
                    <span style={{ fontWeight: 'bold' }}>{dept.count} 人</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#999' }}>暂无数据</p>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="员工状态统计">
            {stats?.employeesByStatus && stats.employeesByStatus.length > 0 ? (
              <div>
                {stats.employeesByStatus.map((statusItem, index) => {
                  const statusMap: Record<string, string> = {
                    pending: '待完善',
                    active: '在职',
                    inactive: '离职',
                  };
                  return (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: index < stats.employeesByStatus.length - 1 ? '1px solid #f0f0f0' : 'none'
                      }}
                    >
                      <span>{statusMap[statusItem.status] || statusItem.status}</span>
                      <span style={{ fontWeight: 'bold' }}>{statusItem.count} 人</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: '#999' }}>暂无数据</p>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
