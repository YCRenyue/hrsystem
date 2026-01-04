/**
 * Hiring Trend Chart Component
 * Displays hiring trends over the past 12 months
 */
import React, { useEffect, useState } from 'react';
import { Line } from '@ant-design/plots';
import { Card, Spin, Empty, App } from 'antd';
import apiClient from '../../services/api';

interface TrendData {
  month: string;
  count: number;
}

const HiringTrendChart: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TrendData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/dashboard/charts/hiring-trend');

        if (response.data.success) {
          const formattedData = response.data.data.map(
            (item: { month: string; hired: number }) => ({
              month: item.month,
              count: item.hired,
            })
          );
          setData(formattedData);
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
    yField: 'count',
    point: {
      shapeField: 'square',
      sizeField: 4,
    },
    style: {
      lineWidth: 2,
    },
    smooth: true,
    axis: {
      x: { title: '月份' },
      y: { title: '入职人数' },
    },
    tooltip: {
      title: (d: TrendData) => d.month,
      items: [
        {
          field: 'count',
          name: '入职人数',
        },
      ],
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
