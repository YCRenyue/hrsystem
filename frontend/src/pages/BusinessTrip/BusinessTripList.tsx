/**
 * BusinessTripList - 出差申请列表
 *
 * 普通员工：仅显示自己的申请，可新建/编辑/撤销/查看详情
 * 管理者（admin/hr_admin/department_manager）：查看全员，含审批入口
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Card,
  App,
  Tag,
  Select,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const { Search } = Input;

interface BusinessTripRow {
  trip_id: string;
  trip_number: string;
  employee_id: string;
  employee?: { employee_number: string; name: string };
  start_datetime: string;
  end_datetime: string;
  destination: string;
  duration_hours: number;
  work_hours: number;
  status: string;
  approver?: { display_name?: string } | null;
}

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  pending: { text: '待审批', color: 'orange' },
  approved: { text: '已批准', color: 'blue' },
  rejected: { text: '已拒绝', color: 'red' },
  cancelled: { text: '已撤销', color: 'default' },
  in_progress: { text: '出差中', color: 'cyan' },
  completed: { text: '已完成', color: 'green' },
};

const BusinessTripList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { message, modal } = App.useApp();

  const isApprover = ['admin', 'hr_admin', 'department_manager'].includes(
    user?.role || ''
  );

  const [data, setData] = useState<BusinessTripRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [queryParams, setQueryParams] = useState<{
    page: number;
    size: number;
    keyword?: string;
    employee_name?: string;
    status?: string;
  }>({ page: 1, size: 10 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/business-trips', { params: queryParams });
      if (response.data.success) {
        setData(response.data.data || []);
        setTotal(response.data.pagination?.total || 0);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '获取出差列表失败');
    } finally {
      setLoading(false);
    }
  }, [queryParams, message]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (keyword: string) => {
    setQueryParams({ ...queryParams, keyword, page: 1 });
  };

  const handleNameSearch = (employeeName: string) => {
    setQueryParams({
      ...queryParams,
      employee_name: employeeName || undefined,
      page: 1
    });
  };

  const handleStatusFilter = (status?: string) => {
    setQueryParams({ ...queryParams, status, page: 1 });
  };

  const handleCancel = (record: BusinessTripRow) => {
    modal.confirm({
      title: '撤销出差申请',
      content: `确认撤销 ${record.trip_number}？已批准的申请会同时清除关联的考勤"出差"标记。`,
      okText: '确认撤销',
      okType: 'danger',
      cancelText: '返回',
      onOk: async () => {
        try {
          await api.post(`/business-trips/${record.trip_id}/cancel`, {
            reason: '申请人主动撤销',
          });
          message.success('已撤销');
          fetchData();
        } catch (error: any) {
          message.error(error.response?.data?.message || '撤销失败');
        }
      },
    });
  };

  const columns: ColumnsType<BusinessTripRow> = [
    {
      title: '出差单号',
      dataIndex: 'trip_number',
      key: 'trip_number',
      width: 160,
    },
    ...(isApprover
      ? ([
          {
            title: '员工',
            key: 'employee',
            width: 160,
            render: (_, r: BusinessTripRow) =>
              r.employee
                ? `${r.employee.employee_number} ${r.employee.name || ''}`
                : '-',
          },
        ] as ColumnsType<BusinessTripRow>)
      : []),
    {
      title: '出差时间',
      key: 'period',
      width: 280,
      render: (_, r) =>
        `${dayjs(r.start_datetime).format('YYYY-MM-DD HH:mm')} ~ ${dayjs(
          r.end_datetime
        ).format('MM-DD HH:mm')}`,
    },
    {
      title: '目的地',
      dataIndex: 'destination',
      key: 'destination',
      width: 180,
      ellipsis: true,
    },
    {
      title: '工时',
      dataIndex: 'work_hours',
      key: 'work_hours',
      width: 90,
      render: (h: number) => `${Number(h).toFixed(1)} h`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const meta = STATUS_LABELS[status] || { text: status, color: 'default' };
        return <Tag color={meta.color}>{meta.text}</Tag>;
      },
    },
    {
      title: '审批人',
      key: 'approver',
      width: 120,
      render: (_, r) => r.approver?.display_name || '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      fixed: 'right',
      render: (_, r) => {
        const isOwner = user?.employee_id === r.employee_id;
        const canEdit = ['draft', 'pending', 'rejected'].includes(r.status) && (isOwner || isApprover);
        const canCancel = ['pending', 'approved', 'in_progress'].includes(r.status) && (isOwner || isApprover);

        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/business-trips/${r.trip_id}`)}
            >
              详情
            </Button>
            {canEdit && (
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => navigate(`/business-trips/${r.trip_id}/edit`)}
              >
                编辑
              </Button>
            )}
            {canCancel && (
              <Button
                type="link"
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleCancel(r)}
              >
                撤销
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space size="middle" wrap>
              {isApprover && (
                <Search
                  placeholder="按员工编号搜索"
                  allowClear
                  enterButton={<SearchOutlined />}
                  onSearch={handleSearch}
                  style={{ width: 220 }}
                />
              )}
              {isApprover && (
                <Search
                  placeholder="按员工姓名搜索"
                  allowClear
                  enterButton={<SearchOutlined />}
                  onSearch={handleNameSearch}
                  style={{ width: 220 }}
                />
              )}
              <Select
                placeholder="状态筛选"
                allowClear
                style={{ width: 160 }}
                onChange={handleStatusFilter}
                options={Object.entries(STATUS_LABELS).map(([value, meta]) => ({
                  value,
                  label: meta.text,
                }))}
              />
            </Space>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/business-trips/new')}
            >
              新建出差申请
            </Button>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="trip_id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            current: queryParams.page,
            pageSize: queryParams.size,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条记录`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (page, size) => {
              setQueryParams({ ...queryParams, page, size });
            },
          }}
        />
      </Card>
    </div>
  );
};

export default BusinessTripList;
