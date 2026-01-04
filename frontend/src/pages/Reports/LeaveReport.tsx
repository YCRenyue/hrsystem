/**
 * Leave Report Component
 *
 * 假期报表组件，支持筛选和数据可视化
 */

import React, { useState, useEffect } from 'react';
import {
  Form,
  DatePicker,
  Select,
  Button,
  Table,
  Card,
  Row,
  Col,
  Statistic,
  Space,
  App
} from 'antd';
import { SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import { Column } from '@ant-design/plots';
import dayjs from 'dayjs';
import apiClient from '../../services/api';
import { usePermission } from '../../hooks/usePermission';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface LeaveReportData {
  leaves: any[];
  statistics: {
    total_leaves: number;
    total_days: number;
    avg_days: number;
  };
  byType: Array<{
    type: string;
    name: string;
    count: number;
    total_days: number;
  }>;
  byDepartment: Array<{
    department_id: string;
    department_name: string;
    count: number;
    total_days: number;
  }> | null;
  total: number;
}

const LeaveReport: React.FC = () => {
  const [form] = Form.useForm();
  const { shouldShowDepartmentFilter } = usePermission();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<LeaveReportData | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);

  const leaveTypeOptions = [
    { value: 'annual', label: '年假' },
    { value: 'sick', label: '病假' },
    { value: 'personal', label: '事假' },
    { value: 'compensatory', label: '调休' },
    { value: 'maternity', label: '产假' },
    { value: 'paternity', label: '陪产假' },
    { value: 'marriage', label: '婚假' },
    { value: 'bereavement', label: '丧假' },
    { value: 'other', label: '其他' }
  ];

  const statusOptions = [
    { value: 'pending', label: '待审批' },
    { value: 'approved', label: '已批准' },
    { value: 'rejected', label: '已拒绝' },
    { value: 'cancelled', label: '已取消' }
  ];

  useEffect(() => {
    if (shouldShowDepartmentFilter()) {
      fetchDepartments();
    }
    // Load default report (last 30 days, approved leaves)
    handleSearch({
      start_date: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
      end_date: dayjs().format('YYYY-MM-DD'),
      status: 'approved'
    });
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await apiClient.get('/departments');
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const handleSearch = async (values?: any) => {
    const filters = values || form.getFieldsValue();

    setLoading(true);
    try {
      const params: any = {};

      if (filters.dateRange) {
        params.start_date = filters.dateRange[0].format('YYYY-MM-DD');
        params.end_date = filters.dateRange[1].format('YYYY-MM-DD');
      } else if (filters.start_date && filters.end_date) {
        params.start_date = filters.start_date;
        params.end_date = filters.end_date;
      }

      if (filters.leave_type) params.leave_type = filters.leave_type;
      if (filters.department_id) params.department_id = filters.department_id;
      if (filters.status) params.status = filters.status;

      const response = await apiClient.get('/reports/leaves', { params });

      if (response.data.success) {
        setReportData(response.data.data);
      } else {
        message.error(response.data.message || '获取报表失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '获取报表失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '员工工号',
      dataIndex: ['employee', 'employee_number'],
      key: 'employee_number'
    },
    {
      title: '员工姓名',
      dataIndex: ['employee', 'name'],
      key: 'name'
    },
    {
      title: '部门',
      dataIndex: ['employee', 'department'],
      key: 'department'
    },
    {
      title: '假期类型',
      dataIndex: 'leave_type',
      key: 'leave_type',
      render: (type: string) => {
        const option = leaveTypeOptions.find(opt => opt.value === type);
        return option?.label || type;
      }
    },
    {
      title: '开始日期',
      dataIndex: 'start_date',
      key: 'start_date'
    },
    {
      title: '结束日期',
      dataIndex: 'end_date',
      key: 'end_date'
    },
    {
      title: '天数',
      dataIndex: 'days',
      key: 'days',
      render: (days: number) => `${days} 天`
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const option = statusOptions.find(opt => opt.value === status);
        return option?.label || status;
      }
    }
  ];

  return (
    <div className="leave-report">
      {/* 筛选表单 */}
      <Card style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="inline"
          onFinish={handleSearch}
        >
          <Form.Item name="dateRange" label="日期范围">
            <RangePicker />
          </Form.Item>

          <Form.Item name="leave_type" label="假期类型">
            <Select style={{ width: 120 }} placeholder="全部" allowClear>
              {leaveTypeOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>

          {shouldShowDepartmentFilter() && (
            <Form.Item name="department_id" label="部门">
              <Select style={{ width: 150 }} placeholder="全部" allowClear>
                {departments.map(dept => (
                  <Option key={dept.department_id} value={dept.department_id}>
                    {dept.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item name="status" label="状态">
            <Select style={{ width: 120 }} placeholder="全部" allowClear>
              {statusOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                查询
              </Button>
              <Button icon={<DownloadOutlined />}>
                导出
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 统计卡片 */}
      {reportData && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card>
                <Statistic
                  title="总请假次数"
                  value={reportData.statistics.total_leaves}
                  suffix="次"
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="总请假天数"
                  value={reportData.statistics.total_days}
                  suffix="天"
                  precision={1}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="平均请假天数"
                  value={reportData.statistics.avg_days}
                  suffix="天"
                  precision={1}
                />
              </Card>
            </Col>
          </Row>

          {/* 按类型统计图表 */}
          {reportData.byType && reportData.byType.length > 0 && (
            <Card title="按假期类型统计" style={{ marginBottom: 16 }}>
              <Column
                data={reportData.byType}
                xField="name"
                yField="total_days"
                label={{
                  position: 'top',
                  style: {
                    fill: '#000000',
                    opacity: 0.6,
                  },
                }}
                meta={{
                  name: { alias: '假期类型' },
                  total_days: { alias: '天数' },
                }}
              />
            </Card>
          )}

          {/* 按部门统计图表 */}
          {reportData.byDepartment && reportData.byDepartment.length > 0 && (
            <Card title="按部门统计" style={{ marginBottom: 16 }}>
              <Column
                data={reportData.byDepartment}
                xField="department_name"
                yField="total_days"
                label={{
                  position: 'top',
                  style: {
                    fill: '#000000',
                    opacity: 0.6,
                  },
                }}
                meta={{
                  department_name: { alias: '部门' },
                  total_days: { alias: '天数' },
                }}
              />
            </Card>
          )}

          {/* 详细数据表格 */}
          <Card title="详细数据">
            <Table
              columns={columns}
              dataSource={reportData.leaves}
              rowKey="leave_id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条记录`
              }}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default LeaveReport;
