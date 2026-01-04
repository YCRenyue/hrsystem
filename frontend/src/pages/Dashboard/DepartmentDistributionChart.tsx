/**
 * Department Distribution Chart Component
 * Displays employee distribution across departments using a pie chart
 */
import React, { useEffect, useState } from 'react';
import { Pie } from '@ant-design/plots';
import { Card, Spin, Empty, App } from 'antd';
import apiClient from '../../services/api';

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
        const response = await apiClient.get('/dashboard/charts/department-distribution');

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
      text: (d: DepartmentData) => {
        const total = data.reduce((sum, item) => sum + item.count, 0);
        const percent = total > 0 ? ((d.count / total) * 100).toFixed(1) : '0';
        return `${d.department} ${percent}%`;
      },
    },
    interaction: {
      elementHighlight: true,
    },
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
