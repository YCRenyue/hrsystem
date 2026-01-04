/**
 * Onboarding/Offboarding Report Component
 *
 * 入离职人员报表组件
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
  Radio,
  App
} from 'antd';
import { SearchOutlined, DownloadOutlined, UserAddOutlined, UserDeleteOutlined } from '@ant-design/icons';
import { Line, Column } from '@ant-design/plots';
import dayjs from 'dayjs';
import apiClient from '../../services/api';
import { usePermission } from '../../hooks/usePermission';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface OnboardingOffboardingReportData {
  onboarding: {
    employees: any[];
    total: number;
    byDepartment: Array<{
      department_id: string;
      department_name: string;
      count: number;
    }> | null;
    byMonth: Array<{
      month: string;
      count: number;
    }>;
  } | null;
  offboarding: {
    employees: any[];
    total: number;
    byDepartment: Array<{
      department_id: string;
      department_name: string;
      count: number;
    }> | null;
    byMonth: Array<{
      month: string;
      count: number;
    }>;
  } | null;
  period: {
    start_date: string;
    end_date: string;
  };
}

const OnboardingOffboardingReport: React.FC = () => {
  const [form] = Form.useForm();
  const { shouldShowDepartmentFilter } = usePermission();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<'onboarding' | 'offboarding' | 'both'>('both');
  const [reportData, setReportData] = useState<OnboardingOffboardingReportData | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    if (shouldShowDepartmentFilter()) {
      fetchDepartments();
    }
    // Load default report (last 12 months)
    handleSearch({
      start_date: dayjs().subtract(12, 'months').format('YYYY-MM-DD'),
      end_date: dayjs().format('YYYY-MM-DD'),
      report_type: 'both'
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
      const params: any = {
        report_type: filters.report_type || reportType
      };

      if (filters.dateRange) {
        params.start_date = filters.dateRange[0].format('YYYY-MM-DD');
        params.end_date = filters.dateRange[1].format('YYYY-MM-DD');
      } else if (filters.start_date && filters.end_date) {
        params.start_date = filters.start_date;
        params.end_date = filters.end_date;
      }

      if (filters.department_id) params.department_id = filters.department_id;
      if (reportType === 'offboarding') params.departure_date = true;

      const response = await apiClient.get('/reports/onboarding-offboarding', { params });

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

  const handleReportTypeChange = (value: 'onboarding' | 'offboarding' | 'both') => {
    setReportType(value);
    form.setFieldsValue({ report_type: value });
  };

  const onboardingColumns = [
    {
      title: '员工工号',
      dataIndex: 'employee_number',
      key: 'employee_number'
    },
    {
      title: '员工姓名',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department'
    },
    {
      title: '入职日期',
      dataIndex: 'entry_date',
      key: 'entry_date'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => status === 'active' ? '在职' : '离职'
    }
  ];

  const offboardingColumns = [
    {
      title: '员工工号',
      dataIndex: 'employee_number',
      key: 'employee_number'
    },
    {
      title: '员工姓名',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department'
    },
    {
      title: '入职日期',
      dataIndex: 'entry_date',
      key: 'entry_date'
    },
    {
      title: '离职日期',
      dataIndex: 'departure_date',
      key: 'departure_date'
    }
  ];

  return (
    <div className="onboarding-offboarding-report">
      {/* 筛选表单 */}
      <Card style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="inline"
          onFinish={handleSearch}
          initialValues={{ report_type: 'both' }}
        >
          <Form.Item name="report_type" label="报表类型">
            <Radio.Group onChange={(e) => handleReportTypeChange(e.target.value)}>
              <Radio.Button value="onboarding">入职</Radio.Button>
              <Radio.Button value="offboarding">离职</Radio.Button>
              <Radio.Button value="both">入职+离职</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="dateRange" label="日期范围">
            <RangePicker />
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

      {reportData && (
        <>
          {/* 统计卡片 */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            {(reportType === 'onboarding' || reportType === 'both') && reportData.onboarding && (
              <Col span={reportType === 'both' ? 12 : 24}>
                <Card>
                  <Statistic
                    title="入职人数"
                    value={reportData.onboarding.total}
                    prefix={<UserAddOutlined />}
                    suffix="人"
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
            )}

            {(reportType === 'offboarding' || reportType === 'both') && reportData.offboarding && (
              <Col span={reportType === 'both' ? 12 : 24}>
                <Card>
                  <Statistic
                    title="离职人数"
                    value={reportData.offboarding.total}
                    prefix={<UserDeleteOutlined />}
                    suffix="人"
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Card>
              </Col>
            )}
          </Row>

          {/* 趋势图表 */}
          {reportType === 'both' && reportData.onboarding && reportData.offboarding && (
            <Card title="入离职趋势" style={{ marginBottom: 16 }}>
              <Line
                data={[
                  ...reportData.onboarding.byMonth.map(item => ({
                    month: item.month,
                    count: item.count,
                    type: '入职'
                  })),
                  ...reportData.offboarding.byMonth.map(item => ({
                    month: item.month,
                    count: item.count,
                    type: '离职'
                  }))
                ]}
                xField="month"
                yField="count"
                colorField="type"
                smooth={true}
                axis={{
                  x: { title: '月份' },
                  y: { title: '人数' },
                }}
              />
            </Card>
          )}

          {/* 入职数据 */}
          {(reportType === 'onboarding' || reportType === 'both') && reportData.onboarding && (
            <>
              {/* 按部门统计 */}
              {reportData.onboarding.byDepartment && reportData.onboarding.byDepartment.length > 0 && (
                <Card title="入职人员按部门统计" style={{ marginBottom: 16 }}>
                  <Column
                    data={reportData.onboarding.byDepartment}
                    xField="department_name"
                    yField="count"
                    label={{
                      text: (d: { count: number }) => `${d.count}`,
                      textBaseline: 'bottom',
                      style: {
                        fill: '#3f8600',
                        opacity: 0.8,
                      },
                    }}
                    axis={{
                      x: { title: '部门' },
                      y: { title: '入职人数' },
                    }}
                  />
                </Card>
              )}

              {/* 详细数据表格 */}
              <Card title="入职人员详细数据" style={{ marginBottom: 16 }}>
                <Table
                  columns={onboardingColumns}
                  dataSource={reportData.onboarding.employees}
                  rowKey="employee_id"
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

          {/* 离职数据 */}
          {(reportType === 'offboarding' || reportType === 'both') && reportData.offboarding && (
            <>
              {/* 按部门统计 */}
              {reportData.offboarding.byDepartment && reportData.offboarding.byDepartment.length > 0 && (
                <Card title="离职人员按部门统计" style={{ marginBottom: 16 }}>
                  <Column
                    data={reportData.offboarding.byDepartment}
                    xField="department_name"
                    yField="count"
                    label={{
                      text: (d: { count: number }) => `${d.count}`,
                      textBaseline: 'bottom',
                      style: {
                        fill: '#cf1322',
                        opacity: 0.8,
                      },
                    }}
                    axis={{
                      x: { title: '部门' },
                      y: { title: '离职人数' },
                    }}
                  />
                </Card>
              )}

              {/* 详细数据表格 */}
              <Card title="离职人员详细数据">
                <Table
                  columns={offboardingColumns}
                  dataSource={reportData.offboarding.employees}
                  rowKey="employee_id"
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
        </>
      )}
    </div>
  );
};

export default OnboardingOffboardingReport;
