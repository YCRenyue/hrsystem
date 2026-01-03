/**
 * Attendance Report Component
 *
 * 考勤报表组件
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
  Tag,
  App
} from 'antd';
import { SearchOutlined, DownloadOutlined, WarningOutlined } from '@ant-design/icons';
import { Column, Pie } from '@ant-design/plots';
import axios from 'axios';
import dayjs from 'dayjs';
import { usePermission } from '../../hooks/usePermission';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface AttendanceReportData {
  attendances: any[];
  statistics: {
    total: number;
    normal: number;
    late: number;
    early_leave: number;
    absent: number;
    leave: number;
    total_late_minutes: number;
    total_early_leave_minutes: number;
    total_work_hours: number;
    total_overtime_hours: number;
  };
  byStatus: Array<{
    status: string;
    name: string;
    count: number;
  }>;
  byDepartment: Array<{
    department_id: string;
    department_name: string;
    total: number;
    normal: number;
    late: number;
    early_leave: number;
    absent: number;
  }> | null;
  abnormalRecords: any[];
  total: number;
}

const AttendanceReport: React.FC = () => {
  const [form] = Form.useForm();
  const { shouldShowDepartmentFilter } = usePermission();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<AttendanceReportData | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);

  const statusOptions = [
    { value: 'normal', label: '正常', color: 'success' },
    { value: 'late', label: '迟到', color: 'warning' },
    { value: 'early_leave', label: '早退', color: 'warning' },
    { value: 'absent', label: '缺勤', color: 'error' },
    { value: 'leave', label: '请假', color: 'default' },
    { value: 'holiday', label: '节假日', color: 'default' },
    { value: 'weekend', label: '周末', color: 'default' }
  ];

  useEffect(() => {
    if (shouldShowDepartmentFilter()) {
      fetchDepartments();
    }
    // Load default report (last 30 days)
    handleSearch({
      start_date: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
      end_date: dayjs().format('YYYY-MM-DD')
    });
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/api/departments');
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

      if (filters.department_id) params.department_id = filters.department_id;
      if (filters.status) params.status = filters.status;

      const response = await axios.get('/api/reports/attendance', { params });

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

  const getStatusTag = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    return <Tag color={option?.color}>{option?.label || status}</Tag>;
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
      title: '日期',
      dataIndex: 'date',
      key: 'date'
    },
    {
      title: '签到时间',
      dataIndex: 'check_in_time',
      key: 'check_in_time'
    },
    {
      title: '签退时间',
      dataIndex: 'check_out_time',
      key: 'check_out_time'
    },
    {
      title: '工作时长',
      dataIndex: 'work_hours',
      key: 'work_hours',
      render: (hours: number) => `${hours.toFixed(1)} 小时`
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: getStatusTag
    }
  ];

  const abnormalColumns = [
    ...columns,
    {
      title: '迟到(分钟)',
      dataIndex: 'late_minutes',
      key: 'late_minutes',
      render: (minutes: number) => minutes || '-'
    },
    {
      title: '早退(分钟)',
      dataIndex: 'early_leave_minutes',
      key: 'early_leave_minutes',
      render: (minutes: number) => minutes || '-'
    }
  ];

  return (
    <div className="attendance-report">
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
            <Col span={6}>
              <Card>
                <Statistic
                  title="总考勤记录"
                  value={reportData.statistics.total}
                  suffix="条"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="正常出勤"
                  value={reportData.statistics.normal}
                  suffix="次"
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="迟到次数"
                  value={reportData.statistics.late}
                  suffix="次"
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="缺勤次数"
                  value={reportData.statistics.absent}
                  suffix="次"
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="累计迟到"
                  value={reportData.statistics.total_late_minutes}
                  suffix="分钟"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="累计早退"
                  value={reportData.statistics.total_early_leave_minutes}
                  suffix="分钟"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总工作时长"
                  value={reportData.statistics.total_work_hours}
                  suffix="小时"
                  precision={1}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总加班时长"
                  value={reportData.statistics.total_overtime_hours}
                  suffix="小时"
                  precision={1}
                />
              </Card>
            </Col>
          </Row>

          {/* 按状态统计图表 */}
          {reportData.byStatus && reportData.byStatus.length > 0 && (
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card title="按状态统计">
                  <Pie
                    data={reportData.byStatus}
                    angleField="count"
                    colorField="name"
                    radius={0.8}
                    label={{
                      type: 'outer',
                      content: '{name}: {value}',
                    }}
                    interactions={[{ type: 'element-active' }]}
                  />
                </Card>
              </Col>

              {/* 按部门统计图表 */}
              {reportData.byDepartment && reportData.byDepartment.length > 0 && (
                <Col span={12}>
                  <Card title="按部门统计">
                    <Column
                      data={reportData.byDepartment}
                      xField="department_name"
                      yField="late"
                      seriesField="type"
                      isGroup={true}
                      label={{
                        position: 'top',
                      }}
                      meta={{
                        department_name: { alias: '部门' },
                        late: { alias: '迟到次数' },
                      }}
                    />
                  </Card>
                </Col>
              )}
            </Row>
          )}

          {/* 异常考勤记录 */}
          {reportData.abnormalRecords && reportData.abnormalRecords.length > 0 && (
            <Card
              title={
                <span>
                  <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
                  异常考勤记录
                </span>
              }
              style={{ marginBottom: 16 }}
            >
              <Table
                columns={abnormalColumns}
                dataSource={reportData.abnormalRecords}
                rowKey="attendance_id"
                loading={loading}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 条异常记录`
                }}
              />
            </Card>
          )}

          {/* 详细数据表格 */}
          <Card title="详细数据">
            <Table
              columns={columns}
              dataSource={reportData.attendances}
              rowKey="attendance_id"
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

export default AttendanceReport;
