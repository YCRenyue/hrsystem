/**
 * Hiring Trend Chart Component
 * Displays hiring trends over the past 12 months
 */
import React, { useEffect, useState } from 'react';
import { Line } from '@ant-design/plots';
import { Card, Spin, Empty, App } from 'antd';
import axios from 'axios';

interface TrendData {
  month: string;
  hired: number;
}

const HiringTrendChart: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TrendData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/dashboard/charts/hiring-trend`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (response.data.success) {
          setData(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch hiring trend:', error);
        message.error('获取入职趋势数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [message]);

  const config = {
    data,
    xField: 'month',
    yField: 'hired',
    label: {},
    point: {
      size: 5,
      shape: 'diamond',
    },
    smooth: true,
    lineStyle: {
      lineWidth: 2,
    },
  };

  if (loading) {
    return (
      <Card title="入职趋势（近12个月）">
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin />
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card title="入职趋势（近12个月）">
        <Empty description="暂无数据" />
      </Card>
    );
  }

  return (
    <Card title="入职趋势（近12个月）">
      <Line {...config} />
    </Card>
  );
};

export default HiringTrendChart;
