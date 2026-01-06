/**
 * Leave List Page - Display leave applications with charts
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Space,
  Button,
  DatePicker,
  Select,
  Tag,
  Row,
  Col,
  Statistic,
  Modal,
  Input,
  App,
  Upload
} from 'antd';
import {
  ReloadOutlined,
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  DownloadOutlined,
  UploadOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { Pie, Column as ColumnChart } from '@ant-design/charts';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import { leaveService, Leave, LeaveStats } from '../../services/leaveService';
import { usePermission } from '../../hooks/usePermission';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;

/**
 * Get leave type display text
 */
const getLeaveTypeText = (type: string): string => {
  const texts: Record<string, string> = {
    annual: '年假',
    sick: '病假',
    personal: '事假',
    compensatory: '调休',
    unpaid: '无薪假'
  };
  return texts[type] || type;
};

/**
 * Get status tag color
 */
const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'error'
  };
  return colors[status] || 'default';
};

/**
 * Get status display text
 */
const getStatusText = (status: string): string => {
  const texts: Record<string, string> = {
    pending: '待审批',
    approved: '已批准',
    rejected: '已拒绝'
  };
  return texts[status] || status;
};

const LeaveList: React.FC = () => {
  const { message, modal } = App.useApp();
  const { hasPermission } = usePermission();
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<Leave[]>([]);
  const [stats, setStats] = useState<LeaveStats | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // Filter states
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs()
  ]);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);

  // Approval modal state
  const [approvalModal, setApprovalModal] = useState<{
    visible: boolean;
    leave: Leave | null;
    action: 'approve' | 'reject' | null;
    notes: string;
  }>({
    visible: false,
    leave: null,
    action: null,
    notes: ''
  });

  /**
   * Fetch leave data
   */
  const fetchData = async () => {
    setLoading(true);
    try {
      const [listResponse, statsResponse] = await Promise.all([
        leaveService.getList({
          page: pagination.current,
          size: pagination.pageSize,
          start_date: dateRange[0].format('YYYY-MM-DD'),
          end_date: dateRange[1].format('YYYY-MM-DD'),
          status: statusFilter,
          leave_type: typeFilter
        }),
        leaveService.getStats({
          start_date: dateRange[0].format('YYYY-MM-DD'),
          end_date: dateRange[1].format('YYYY-MM-DD')
        })
      ]);

      setDataSource(listResponse.rows);
      setPagination(prev => ({
        ...prev,
        total: listResponse.total
      }));
      setStats(statsResponse);
    } catch (error) {
      message.error('加载请假数据失败');
      console.error('Error loading leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.pageSize, dateRange, statusFilter, typeFilter]);

  /**
   * Handle table change
   */
  const handleTableChange = (newPagination: any) => {
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
      total: pagination.total
    });
  };

  /**
   * Handle date range change
   */
  const handleDateRangeChange = (dates: null | [Dayjs | null, Dayjs | null]) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
      setPagination(prev => ({ ...prev, current: 1 }));
    }
  };

  /**
   * Handle status filter change
   */
  const handleStatusChange = (value: string | undefined) => {
    setStatusFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /**
   * Handle type filter change
   */
  const handleTypeChange = (value: string | undefined) => {
    setTypeFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /**
   * Open approval modal
   */
  const openApprovalModal = (leave: Leave, action: 'approve' | 'reject') => {
    setApprovalModal({
      visible: true,
      leave,
      action,
      notes: ''
    });
  };

  /**
   * Handle approval/rejection
   */
  const handleApprovalAction = async () => {
    if (!approvalModal.leave || !approvalModal.action) return;

    try {
      if (approvalModal.action === 'approve') {
        await leaveService.approve(approvalModal.leave.leave_id, approvalModal.notes);
        message.success('请假申请已批准');
      } else {
        await leaveService.reject(approvalModal.leave.leave_id, approvalModal.notes);
        message.success('请假申请已拒绝');
      }

      setApprovalModal({
        visible: false,
        leave: null,
        action: null,
        notes: ''
      });

      fetchData();
    } catch (error) {
      message.error('操作失败');
      console.error('Error processing leave approval:', error);
    }
  };

  /**
   * Download Excel template
   */
  const handleDownloadTemplate = async () => {
    try {
      const blob = await leaveService.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `请假导入模板_${dayjs().format('YYYY-MM-DD')}.xlsx`;
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

  /**
   * Import from Excel
   */
  const handleImport = async (file: File) => {
    const hideLoading = message.loading('正在导入...', 0);
    try {
      const result = await leaveService.importFromExcel(file);
      hideLoading();

      const { success_count, error_count, errors } = result;

      if (error_count > 0) {
        modal.warning({
          title: '导入完成',
          width: 500,
          content: (
            <div>
              <p>成功导入 {success_count} 条记录，失败 {error_count} 条</p>
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {errors.map((err, index) => (
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

      fetchData();
    } catch (error: any) {
      hideLoading();
      message.error(error.response?.data?.message || '导入失败');
    }

    return false;
  };

  /**
   * Export to Excel
   */
  const handleExport = async () => {
    try {
      const blob = await leaveService.exportToExcel({
        start_date: dateRange[0].format('YYYY-MM-DD'),
        end_date: dateRange[1].format('YYYY-MM-DD'),
        leave_type: typeFilter,
        status: statusFilter
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `请假记录_${dayjs().format('YYYY-MM-DD')}.xlsx`;
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

  /**
   * Table columns
   */
  const columns: ColumnsType<Leave> = [
    {
      title: '申请日期',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: '员工编号',
      dataIndex: ['employee', 'employee_number'],
      key: 'employee_number'
    },
    {
      title: '员工姓名',
      dataIndex: ['employee', 'name'],
      key: 'name',
      render: (name: string) => name || '-'
    },
    {
      title: '部门',
      dataIndex: ['employee', 'department', 'name'],
      key: 'department'
    },
    {
      title: '请假类型',
      dataIndex: 'leave_type',
      key: 'leave_type',
      render: (type: string) => (
        <Tag>{getLeaveTypeText(type)}</Tag>
      )
    },
    {
      title: '开始日期',
      dataIndex: 'start_date',
      key: 'start_date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: '结束日期',
      dataIndex: 'end_date',
      key: 'end_date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: '天数',
      dataIndex: 'days',
      key: 'days',
      render: (days: number) => `${days}天`
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (reason: string) => reason || '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Leave) => (
        record.status === 'pending' ? (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => openApprovalModal(record, 'approve')}
            >
              批准
            </Button>
            <Button
              type="link"
              size="small"
              danger
              icon={<CloseOutlined />}
              onClick={() => openApprovalModal(record, 'reject')}
            >
              拒绝
            </Button>
          </Space>
        ) : (
          <span>-</span>
        )
      )
    }
  ];

  /**
   * Prepare pie chart data (by type)
   */
  const pieDataByType = stats?.byType.map(item => ({
    type: getLeaveTypeText(item.leave_type),
    value: Number(item.count)
  })) || [];

  /**
   * Pie chart config
   */
  const pieConfig = {
    data: pieDataByType,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      text: 'type',
      style: {
        fontSize: 12,
        textAlign: 'center'
      }
    },
    interactions: [{ type: 'element-active' }],
    legend: {
      position: 'bottom' as const
    }
  };

  /**
   * Prepare column chart data (by status)
   */
  const columnDataByStatus = stats?.byStatus.map(item => ({
    status: getStatusText(item.status),
    count: Number(item.count)
  })) || [];

  /**
   * Column chart config
   */
  const getColumnColor = (datum: { status: string }) => {
    if (datum.status === '已批准') return '#52c41a';
    if (datum.status === '待审批') return '#faad14';
    if (datum.status === '已拒绝') return '#f5222d';
    return '#1890ff';
  };

  const columnConfig = {
    data: columnDataByStatus,
    xField: 'status',
    yField: 'count',
    columnStyle: {
      radius: [4, 4, 0, 0]
    },
    color: getColumnColor
  };

  return (
    <div style={{ padding: '24px' }}>
      <h2>请假管理</h2>

      {/* Statistics Cards */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="总申请数"
                value={stats.totalApplications}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="待审批"
                value={stats.pendingCount}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="已批准"
                value={stats.approvedCount}
                prefix={<CheckOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="已拒绝"
                value={stats.rejectedCount}
                prefix={<CloseOutlined />}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Charts */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="请假类型分布" variant="borderless">
            <Pie {...pieConfig} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="审批状态统计" variant="borderless">
            <ColumnChart {...columnConfig} />
          </Card>
        </Col>
      </Row>

      {/* Data Table */}
      <Card>
        <Space style={{ marginBottom: '16px' }} wrap>
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            format="YYYY-MM-DD"
          />
          <Select
            placeholder="请假类型"
            style={{ width: 120 }}
            allowClear
            value={typeFilter}
            onChange={handleTypeChange}
          >
            <Option value="annual">年假</Option>
            <Option value="sick">病假</Option>
            <Option value="personal">事假</Option>
            <Option value="compensatory">调休</Option>
            <Option value="unpaid">无薪假</Option>
          </Select>
          <Select
            placeholder="审批状态"
            style={{ width: 120 }}
            allowClear
            value={statusFilter}
            onChange={handleStatusChange}
          >
            <Option value="pending">待审批</Option>
            <Option value="approved">已批准</Option>
            <Option value="rejected">已拒绝</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
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

        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="leave_id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* Approval Modal */}
      <Modal
        title={approvalModal.action === 'approve' ? '批准请假申请' : '拒绝请假申请'}
        open={approvalModal.visible}
        onOk={handleApprovalAction}
        onCancel={() => setApprovalModal({ visible: false, leave: null, action: null, notes: '' })}
        okText="确认"
        cancelText="取消"
      >
        {approvalModal.leave && (
          <div>
            <p><strong>姓名：</strong>{approvalModal.leave.employee?.name || '-'}</p>
            <p><strong>类型：</strong>{getLeaveTypeText(approvalModal.leave.leave_type)}</p>
            <p><strong>时间：</strong>{dayjs(approvalModal.leave.start_date).format('YYYY-MM-DD')} 至 {dayjs(approvalModal.leave.end_date).format('YYYY-MM-DD')}</p>
            <p><strong>天数：</strong>{approvalModal.leave.days}天</p>
            <p><strong>原因：</strong>{approvalModal.leave.reason}</p>
            <TextArea
              rows={4}
              placeholder="审批意见（可选）"
              value={approvalModal.notes}
              onChange={(e) => setApprovalModal({ ...approvalModal, notes: e.target.value })}
              style={{ marginTop: '16px' }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LeaveList;
