/**
 * Department Distribution Chart Component
 * Displays employee distribution across departments using a pie chart
 */
import React, { useEffect, useState } from 'react';
import { Pie } from '@ant-design/plots';
import { Card, Spin, Empty, App } from 'antd';
import axios from 'axios';

interface DepartmentData {
  department: string;
  count: number;
}

const DepartmentDistributionChart: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DepartmentData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/dashboard/charts/department-distribution`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (response.data.success) {
          setData(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch department distribution:', error);
        message.error('获取部门分布数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [message]);

  const config = {
    data,
    angleField: 'count',
    colorField: 'department',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name} {percentage}',
    },
    interactions: [
      {
        type: 'element-active',
      },
    ],
  };

  if (loading) {
    return (
      <Card title="部门人员分布">
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin />
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card title="部门人员分布">
        <Empty description="暂无数据" />
      </Card>
    );
  }

  return (
    <Card title="部门人员分布">
      <Pie {...config} />
    </Card>
  );
};

export default DepartmentDistributionChart;
