/**
 * Attendance Analysis Chart Component
 * Displays attendance status distribution
 */
import React, { useEffect, useState } from 'react';
import { Column } from '@ant-design/plots';
import { Card, Spin, Empty, App } from 'antd';
import apiClient from '../../services/api';

interface StatusData {
  status: string;
  count: number;
}

interface AttendanceData {
  statusDistribution: StatusData[];
}

const AttendanceAnalysisChart: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatusData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<{ success: boolean; data: AttendanceData }>(
          '/dashboard/charts/attendance-analysis'
        );

        if (response.data.success && response.data.data.statusDistribution) {
          // Map status names to Chinese
          const statusMap: Record<string, string> = {
            normal: '正常',
            late: '迟到',
            early_leave: '早退',
            absent: '缺勤',
            leave: '请假',
            holiday: '节假日',
            weekend: '周末',
          };

          const formattedData = response.data.data.statusDistribution.map(item => ({
            status: statusMap[item.status] || item.status,
            count: item.count,
          }));

          setData(formattedData);
        }
      } catch (error) {
        console.error('Failed to fetch attendance analysis:', error);
        message.error('获取考勤分析数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [message]);

  const config = {
    data,
    xField: 'status',
    yField: 'count',
    label: {
      text: (d: StatusData) => `${d.count}`,
      textBaseline: 'middle' as const,
      style: {
        fill: '#FFFFFF',
        opacity: 0.6,
      },
    },
    axis: {
      x: {
        title: '考勤状态',
        label: {
          autoHide: true,
          autoRotate: false,
        },
      },
      y: {
        title: '人次',
      },
    },
  };

  if (loading) {
    return (
      <Card title="考勤状况分析（本月）">
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin />
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card title="考勤状况分析（本月）">
        <Empty description="暂无数据" />
      </Card>
    );
  }

  return (
    <Card title="考勤状况分析（本月）">
      <Column {...config} />
    </Card>
  );
};

export default AttendanceAnalysisChart;
