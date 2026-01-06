/**
 * Attendance List Page
 * 考勤管理列表页面
 */

import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  DatePicker,
  Select,
  Row,
  Col,
  Statistic,
  App,
  Upload,
} from 'antd';
import {
  ReloadOutlined,
  ExportOutlined,
  DownloadOutlined,
  UploadOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { Pie, Column as ColumnChart } from '@ant-design/charts';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { FilterValue, SorterResult } from 'antd/es/table/interface';
import dayjs, { Dayjs } from 'dayjs';
import { usePermission } from '../../hooks/usePermission';
import { attendanceService, AttendanceStats } from '../../services/attendanceService';
import apiClient from '../../services/api';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface AttendanceRecord {
  attendance_id: string;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department_name: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: 'normal' | 'late' | 'early_leave' | 'absent' | 'leave' | 'holiday' | 'weekend';
  late_minutes: number;
  early_leave_minutes: number;
  work_hours: number | null;
  overtime_hours: number;
  location: string | null;
  notes: string | null;
}

interface AttendanceListState {
  data: AttendanceRecord[];
  loading: boolean;
  pagination: TablePaginationConfig;
  filters: {
    dateRange: [Dayjs, Dayjs] | null;
    status: string | undefined;
    department_id: string | undefined;
  };
  stats: AttendanceStats | null;
}

const AttendanceList: React.FC = () => {
  const { hasPermission, dataScope } = usePermission();
  const { message, modal } = App.useApp();
  const [state, setState] = useState<AttendanceListState>({
    data: [],
    loading: false,
    pagination: {
      current: 1,
      pageSize: 10,
      total: 0,
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: (total) => `共 ${total} 条记录`,
    },
    filters: {
      dateRange: [dayjs().startOf('month'), dayjs().endOf('day')],
      status: undefined,
      department_id: undefined,
    },
    stats: null,
  });

  const [departments, setDepartments] = useState<Array<{ department_id: string; name: string }>>([]);

  // 考勤状态映射
  const statusMap: Record<string, { text: string; color: string }> = {
    normal: { text: '正常', color: 'success' },
    late: { text: '迟到', color: 'warning' },
    early_leave: { text: '早退', color: 'warning' },
    absent: { text: '缺勤', color: 'error' },
    leave: { text: '请假', color: 'default' },
    holiday: { text: '节假日', color: 'blue' },
    weekend: { text: '周末', color: 'default' },
  };

  // 加载部门列表
  useEffect(() => {
    if (dataScope === 'all') {
      // 仅管理员需要部门筛选
      fetchDepartments();
    }
  }, [dataScope]);

  // 加载考勤数据
  useEffect(() => {
    fetchAttendanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pagination.current, state.pagination.pageSize, state.filters]);

  const fetchDepartments = async () => {
    try {
      const response = await apiClient.get('/departments');
      if (response.data.success) {
        setDepartments(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchAttendanceData = async () => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      // Prepare parameters for both list and stats
      const listParams = {
        page: state.pagination.current,
        size: state.pagination.pageSize,
        start_date: state.filters.dateRange?.[0].format('YYYY-MM-DD'),
        end_date: state.filters.dateRange?.[1].format('YYYY-MM-DD'),
        status: state.filters.status,
        department_id: state.filters.department_id,
      };

      const statsParams = {
        start_date: state.filters.dateRange?.[0].format('YYYY-MM-DD'),
        end_date: state.filters.dateRange?.[1].format('YYYY-MM-DD'),
        department_id: state.filters.department_id,
      };

      // Fetch both list and stats in parallel
      const [listResponse, statsResponse] = await Promise.all([
        attendanceService.getList(listParams),
        attendanceService.getStats(statsParams),
      ]);

      setState(prev => ({
        ...prev,
        data: listResponse.rows.map(row => ({
          attendance_id: row.attendance_id,
          employee_id: row.employee_id,
          employee_number: row.employee?.employee_number || '',
          employee_name: row.employee?.name || '',
          department_name: row.employee?.department?.name || '',
          date: row.date,
          check_in_time: row.check_in_time,
          check_out_time: row.check_out_time,
          status: row.status,
          late_minutes: row.late_minutes,
          early_leave_minutes: row.early_leave_minutes,
          work_hours: row.work_hours,
          overtime_hours: row.overtime_hours,
          location: row.location || null,
          notes: row.notes || null,
        })),
        loading: false,
        pagination: {
          ...prev.pagination,
          total: listResponse.total,
        },
        stats: statsResponse,
      }));
    } catch (error) {
      console.error('Failed to fetch attendance data:', error);
      message.error('加载考勤数据失败');
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: Record<string, FilterValue | null>,
    _sorter: SorterResult<AttendanceRecord> | SorterResult<AttendanceRecord>[]
  ) => {
    setState(prev => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        current: pagination.current || 1,
        pageSize: pagination.pageSize || 10,
      },
    }));
  };

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    // Filter out null values and ensure we have both start and end dates
    const validDates = dates && dates[0] && dates[1] ? [dates[0], dates[1]] as [Dayjs, Dayjs] : null;

    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        dateRange: validDates,
      },
      pagination: {
        ...prev.pagination,
        current: 1,
      },
    }));
  };

  const handleStatusChange = (value: string | undefined) => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        status: value,
      },
      pagination: {
        ...prev.pagination,
        current: 1,
      },
    }));
  };

  const handleDepartmentChange = (value: string | undefined) => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        department_id: value,
      },
      pagination: {
        ...prev.pagination,
        current: 1,
      },
    }));
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();

      if (state.filters.dateRange) {
        params.append('start_date', state.filters.dateRange[0].format('YYYY-MM-DD'));
        params.append('end_date', state.filters.dateRange[1].format('YYYY-MM-DD'));
      }

      if (state.filters.status) {
        params.append('status', state.filters.status);
      }

      if (state.filters.department_id) {
        params.append('department_id', state.filters.department_id);
      }

      const response = await apiClient.get(`/attendances/export?${params.toString()}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `考勤记录_${dayjs().format('YYYY-MM-DD')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success('导出成功');
    } catch (error) {
      console.error('Failed to export:', error);
      message.error('导出失败');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await apiClient.get('/attendances/template', {
        responseType: 'blob',
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `考勤导入模板_${dayjs().format('YYYY-MM-DD')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success('模板下载成功');
    } catch (error) {
      console.error('Failed to download template:', error);
      message.error('模板下载失败');
    }
  };

  const handleImport = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const hideLoading = message.loading('正在导入...', 0);
    try {
      const response = await apiClient.post('/attendances/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      hideLoading();

      const { success_count, error_count, errors } = response.data.data;

      if (error_count > 0) {
        modal.warning({
          title: '导入完成',
          width: 500,
          content: (
            <div>
              <p>成功导入 {success_count} 条记录，失败 {error_count} 条</p>
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {errors.map((err: { row: number; message: string }, index: number) => (
                  <p key={index} style={{ color: 'red', margin: '4px 0' }}>
                    第 {err.row} 行: {err.message}
                  </p>
                ))}
              </div>
            </div>
          ),
        });
      } else {
        message.success(`成功导入 ${success_count} 条记录`);
      }

      fetchAttendanceData();
    } catch (error: any) {
      hideLoading();
      message.error(error.response?.data?.message || '导入失败');
    }

    return false;
  };

  const formatNumber = (amount?: number | string) => {
    const num = Number(amount)
    return Number.isFinite(num) ? `${num.toFixed(1)}` : '-'
  }

  const columns: ColumnsType<AttendanceRecord> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '工号',
      dataIndex: 'employee_number',
      key: 'employee_number',
      width: 100,
    },
    {
      title: '姓名',
      dataIndex: 'employee_name',
      key: 'employee_name',
      width: 100,
    },
    {
      title: '部门',
      dataIndex: 'department_name',
      key: 'department_name',
      width: 120,
    },
    {
      title: '签到时间',
      dataIndex: 'check_in_time',
      key: 'check_in_time',
      width: 100,
      render: (time: string | null) => time || '-',
    },
    {
      title: '签退时间',
      dataIndex: 'check_out_time',
      key: 'check_out_time',
      width: 100,
      render: (time: string | null) => time || '-',
    },
    {
      title: '工作时长',
      dataIndex: 'work_hours',
      key: 'work_hours',
      width: 100,
      render: (hours?: number | string) => hours ? `${formatNumber(hours)}h` : '-',
    },
    {
      title: '迟到',
      dataIndex: 'late_minutes',
      key: 'late_minutes',
      width: 80,
      render: (minutes?: number | string) => minutes ? `${minutes}分钟` : '-',
    },
    {
      title: '早退',
      dataIndex: 'early_leave_minutes',
      key: 'early_leave_minutes',
      width: 80,
      render: (minutes?: number | string) => minutes ? `${minutes}分钟` : '-',
    },
    {
      title: '加班',
      dataIndex: 'overtime_hours',
      key: 'overtime_hours',
      width: 80,
      render: (hours?: number | string) => hours ? `${formatNumber(hours)}h` : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={statusMap[status]?.color || 'default'}>
          {statusMap[status]?.text || status}
        </Tag>
      ),
    },
    {
      title: '打卡地点',
      dataIndex: 'location',
      key: 'location',
      width: 150,
      ellipsis: true,
      render: (location: string | null) => location || '-',
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      width: 150,
      ellipsis: true,
      render: (notes: string | null) => notes || '-',
    },
  ];

  // Prepare pie chart data
  const pieData = state.stats?.byStatus.map(item => ({
    type: statusMap[item.status]?.text || item.status,
    value: Number(item.count),
  })) || [];

  // Pie chart config
  const pieConfig = {
    data: pieData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      text: (d: any) => `${d.type}: ${d.value}`,
      position: 'outside' as const,
    },
    legend: {
      position: 'right' as const,
    },
    interactions: [{ type: 'element-active' }],
  };

  // Prepare column chart data (daily attendance trends)
  const columnData: Array<{ date: string; type: string; value: number }> = [];
  const dateMap = new Map<string, Map<string, number>>();

  state.data.forEach(record => {
    const date = dayjs(record.date).format('MM-DD');
    const statusText = statusMap[record.status]?.text || record.status;

    if (!dateMap.has(date)) {
      dateMap.set(date, new Map());
    }

    const statusCounts = dateMap.get(date)!;
    statusCounts.set(statusText, (statusCounts.get(statusText) || 0) + 1);
  });

  dateMap.forEach((statusCounts, date) => {
    statusCounts.forEach((count, statusText) => {
      columnData.push({ date, type: statusText, value: count });
    });
  });

  return (
    <div style={{ padding: '24px' }}>
      <h2>考勤管理</h2>

      {/* Statistics Cards */}
      {state.stats && (
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="总考勤记录"
                value={state.stats.totalRecords}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="出勤率"
                value={state.stats.attendanceRate}
                suffix="%"
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="迟到次数"
                value={state.stats.lateCount}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="缺勤次数"
                value={state.stats.absentCount}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Charts */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="考勤状态分布">
            <Pie {...pieConfig} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="每日考勤趋势">
            <ColumnChart
              data={columnData}
              xField="date"
              yField="value"
              colorField="type"
              transform={[{ type: 'dodgeX' }]}
              scale={{
                x: { type: 'band', padding: 0.2 },
              }}
              style={{
                radiusTopLeft: 4,
                radiusTopRight: 4,
              }}
              legend={{
                position: 'top-right' as const,
              }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* 筛选区域 */}
          <Space wrap>
            <RangePicker
              value={state.filters.dateRange}
              onChange={handleDateRangeChange}
              format="YYYY-MM-DD"
              placeholder={['开始日期', '结束日期']}
            />

            <Select
              placeholder="考勤状态"
              style={{ width: 120 }}
              allowClear
              value={state.filters.status}
              onChange={handleStatusChange}
            >
              {Object.entries(statusMap).map(([key, value]) => (
                <Option key={key} value={key}>
                  {value.text}
                </Option>
              ))}
            </Select>

            {dataScope === 'all' && (
              <Select
                placeholder="选择部门"
                style={{ width: 150 }}
                allowClear
                value={state.filters.department_id}
                onChange={handleDepartmentChange}
              >
                {departments.map(dept => (
                  <Option key={dept.department_id} value={dept.department_id}>
                    {dept.name}
                  </Option>
                ))}
              </Select>
            )}

            <Button
              icon={<ReloadOutlined />}
              onClick={fetchAttendanceData}
            >
              刷新
            </Button>

            {hasPermission('employees.export') && (
              <>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadTemplate}
                >
                  下载模板
                </Button>

                <Upload
                  accept=".xlsx,.xls"
                  showUploadList={false}
                  beforeUpload={handleImport}
                >
                  <Button icon={<UploadOutlined />}>
                    导入
                  </Button>
                </Upload>

                <Button
                  type="primary"
                  icon={<ExportOutlined />}
                  onClick={handleExport}
                >
                  导出
                </Button>
              </>
            )}
          </Space>

          {/* 考勤表格 */}
          <Table
            columns={columns}
            dataSource={state.data}
            rowKey="attendance_id"
            loading={state.loading}
            pagination={state.pagination}
            onChange={handleTableChange}
            scroll={{ x: 1400 }}
            size="middle"
          />
        </Space>
      </Card>
    </div>
  );
};

export default AttendanceList;
