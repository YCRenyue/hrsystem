/**
 * Reports Page
 *
 * 多维度报表页面，支持按权限查看
 */

import React, { useState } from 'react';
import { Card, Tabs } from 'antd';
import { FileTextOutlined, ClockCircleOutlined, UserAddOutlined } from '@ant-design/icons';
import LeaveReport from './LeaveReport';
import AttendanceReport from './AttendanceReport';
import OnboardingOffboardingReport from './OnboardingOffboardingReport';
import { usePermission } from '../../hooks/usePermission';

const { TabPane } = Tabs;

const Reports: React.FC = () => {
  const { canViewReports } = usePermission();
  const [activeTab, setActiveTab] = useState('leave');

  if (!canViewReports()) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <p>您没有权限查看报表</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="reports-page">
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
        >
          <TabPane
            tab={
              <span>
                <FileTextOutlined />
                假期报表
              </span>
            }
            key="leave"
          >
            <LeaveReport />
          </TabPane>

          <TabPane
            tab={
              <span>
                <ClockCircleOutlined />
                考勤报表
              </span>
            }
            key="attendance"
          >
            <AttendanceReport />
          </TabPane>

          <TabPane
            tab={
              <span>
                <UserAddOutlined />
                入离职报表
              </span>
            }
            key="onboarding"
          >
            <OnboardingOffboardingReport />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default Reports;
