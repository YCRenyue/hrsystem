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
  message,
  Spin
} from 'antd';
import { ReloadOutlined, ExportOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { FilterValue, SorterResult } from 'antd/es/table/interface';
import dayjs, { Dayjs } from 'dayjs';
import { usePermission } from '../../hooks/usePermission';

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
}

const AttendanceList: React.FC = () => {
  const { hasPermission, dataScope } = usePermission();
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
  }, [state.pagination.current, state.pagination.pageSize, state.filters]);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        setDepartments(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchAttendanceData = async () => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      const params = new URLSearchParams({
        page: String(state.pagination.current),
        size: String(state.pagination.pageSize),
      });

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

      const response = await fetch(`/api/attendance?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setState(prev => ({
          ...prev,
          data: result.data,
          loading: false,
          pagination: {
            ...prev.pagination,
            total: result.pagination.total,
          },
        }));
      } else {
        message.error(result.message || '加载考勤数据失败');
        setState(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Failed to fetch attendance data:', error);
      message.error('加载考勤数据失败');
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleTableChange = (
    pagination: TablePaginationConfig,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<AttendanceRecord> | SorterResult<AttendanceRecord>[]
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

  const handleDateRangeChange = (dates: [Dayjs, Dayjs] | null) => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        dateRange: dates,
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

      const response = await fetch(`/api/attendance/export?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `考勤记录_${dayjs().format('YYYY-MM-DD')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        message.success('导出成功');
      } else {
        message.error('导出失败');
      }
    } catch (error) {
      console.error('Failed to export:', error);
      message.error('导出失败');
    }
  };

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
      render: (hours: number | null) => hours ? `${hours.toFixed(1)}h` : '-',
    },
    {
      title: '迟到',
      dataIndex: 'late_minutes',
      key: 'late_minutes',
      width: 80,
      render: (minutes: number) => minutes > 0 ? `${minutes}分钟` : '-',
    },
    {
      title: '早退',
      dataIndex: 'early_leave_minutes',
      key: 'early_leave_minutes',
      width: 80,
      render: (minutes: number) => minutes > 0 ? `${minutes}分钟` : '-',
    },
    {
      title: '加班',
      dataIndex: 'overtime_hours',
      key: 'overtime_hours',
      width: 80,
      render: (hours: number) => hours > 0 ? `${hours.toFixed(1)}h` : '-',
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

  return (
    <div style={{ padding: '24px' }}>
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
              <Button
                type="primary"
                icon={<ExportOutlined />}
                onClick={handleExport}
              >
                导出
              </Button>
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
