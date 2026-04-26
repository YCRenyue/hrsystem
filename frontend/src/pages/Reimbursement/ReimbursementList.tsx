/**
 * ReimbursementList - 报销单列表
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Card, Table, Tag, Space, Button, Input, Select, App,
} from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { reimbursementService, ReimbursementSummary } from '../../services/reimbursementService';
import { useAuth } from '../../contexts/AuthContext';

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  pending: { text: '待审核', color: 'orange' },
  approved: { text: '已通过', color: 'blue' },
  rejected: { text: '已驳回', color: 'red' },
  paid: { text: '已发放', color: 'green' },
  cancelled: { text: '已撤销', color: 'default' },
};

const ReimbursementList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { message, modal } = App.useApp();
  const [data, setData] = useState<ReimbursementSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [status, setStatus] = useState<string | undefined>();

  const isManager = ['admin', 'hr_admin'].includes(user?.role || '');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reimbursementService.list({
        page,
        size: pageSize,
        keyword: keyword || undefined,
        employee_name: employeeName || undefined,
        status,
      });
      setData(res.data || []);
      setTotal(res.pagination?.total || 0);
    } catch (e: any) {
      message.error(e?.response?.data?.message || '加载报销单失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, employeeName, status, message]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCancel = (record: ReimbursementSummary) => {
    modal.confirm({
      title: '撤销报销单',
      content: `确认撤销报销单 ${record.reimbursement_number}？`,
      okText: '确认撤销',
      okType: 'danger',
      cancelText: '返回',
      onOk: async () => {
        try {
          await reimbursementService.cancel(record.reimbursement_id, '申请人主动撤销');
          message.success('已撤销');
          fetchData();
        } catch (e: any) {
          message.error(e?.response?.data?.message || '撤销失败');
        }
      },
    });
  };

  const columns = [
    { title: '报销单号', dataIndex: 'reimbursement_number', width: 180 },
    ...(isManager
      ? [{
        title: '员工',
        key: 'employee',
        width: 160,
        render: (_: any, r: ReimbursementSummary) => (
          r.employee
            ? `${r.employee.employee_number} ${r.employee.name || ''}`
            : '-'
        ),
      }]
      : []),
    {
      title: '关联出差单',
      key: 'trip',
      width: 200,
      render: (_: any, r: ReimbursementSummary) => (
        r.trip
          ? (
            <Button
              type="link"
              size="small"
              onClick={() => navigate(`/business-trips/${r.trip!.trip_id}`)}
            >
              {r.trip.trip_number}
            </Button>
          )
          : '-'
      ),
    },
    {
      title: '金额',
      dataIndex: 'total_amount',
      width: 120,
      render: (v: number) => `¥${Number(v).toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => {
        const meta = STATUS_LABELS[s] || { text: s, color: 'default' };
        return <Tag color={meta.color}>{meta.text}</Tag>;
      },
    },
    {
      title: '提交时间',
      dataIndex: 'submitted_at',
      width: 160,
      render: (v?: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: any, r: ReimbursementSummary) => {
        const isOwn = r.employee_id && user?.employee_id && r.employee_id === user.employee_id;
        const canEdit = ['draft', 'rejected'].includes(r.status) && (isOwn || isManager);
        const canCancel = ['pending', 'approved'].includes(r.status) && (isOwn || isManager);
        return (
          <Space>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/reimbursements/${r.reimbursement_id}`)}
            >
              查看
            </Button>
            {canEdit && (
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => navigate(`/reimbursements/${r.reimbursement_id}/edit`)}
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
    <Card
      title="差旅报销"
      extra={(
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/reimbursements/new')}
        >
          新建报销单
        </Button>
      )}
    >
      <Space style={{ marginBottom: 16 }} wrap>
        {isManager && (
          <Input.Search
            placeholder="按工号搜索"
            allowClear
            style={{ width: 200 }}
            onSearch={(v) => {
              setPage(1);
              setKeyword(v);
            }}
          />
        )}
        {isManager && (
          <Input.Search
            placeholder="按员工姓名搜索"
            allowClear
            style={{ width: 200 }}
            onSearch={(v) => {
              setPage(1);
              setEmployeeName(v);
            }}
          />
        )}
        <Select
          allowClear
          placeholder="状态筛选"
          style={{ width: 140 }}
          value={status}
          onChange={(v) => {
            setPage(1);
            setStatus(v);
          }}
          options={Object.entries(STATUS_LABELS).map(([v, m]) => ({
            value: v,
            label: m.text,
          }))}
        />
      </Space>

      <Table
        rowKey="reimbursement_id"
        loading={loading}
        columns={columns as any}
        dataSource={data}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />
    </Card>
  );
};

export default ReimbursementList;
