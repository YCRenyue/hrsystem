/**
 * ReimbursementDetail - 报销单详情、审核、发放
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Card, Descriptions, Tag, Space, Button, App, Skeleton, Divider, Table,
  Modal, Input, Statistic, Row, Col, Typography,
} from 'antd';
import {
  ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined,
  EditOutlined, EyeOutlined, DollarOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../services/api';
import {
  reimbursementService, ReimbursementDetail as RBDetail, ReimbursementCategory,
} from '../../services/reimbursementService';
import { useAuth } from '../../contexts/AuthContext';

const { TextArea } = Input;
const { Text } = Typography;

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  pending: { text: '待审核', color: 'orange' },
  approved: { text: '已通过', color: 'blue' },
  rejected: { text: '已驳回', color: 'red' },
  paid: { text: '已发放', color: 'green' },
  cancelled: { text: '已撤销', color: 'default' },
};

const CATEGORY_LABELS: Record<ReimbursementCategory, string> = {
  transport: '长途交通',
  accommodation: '住宿',
  meal: '餐费',
  local_transport: '市内交通',
  other: '其他',
};

const ReimbursementDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { message, modal } = App.useApp();

  const [data, setData] = useState<RBDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState<null | 'approved' | 'rejected'>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [payRefOpen, setPayRefOpen] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');

  const isFinance = ['admin', 'hr_admin'].includes(user?.role || '');

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const detail = await reimbursementService.getById(id);
      setData(detail);
    } catch (e: any) {
      message.error(e?.response?.data?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id, message]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDecision = async () => {
    if (!data || !decision) return;
    setBusy(true);
    try {
      await reimbursementService.approve(data.reimbursement_id, decision, notes);
      message.success(decision === 'approved' ? '已审核通过' : '已驳回');
      setDecision(null);
      setNotes('');
      fetchData();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const handlePay = async () => {
    if (!data) return;
    setBusy(true);
    try {
      await reimbursementService.pay(data.reimbursement_id, paymentRef);
      message.success('已标记发放');
      setPayRefOpen(false);
      setPaymentRef('');
      fetchData();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!data) return;
    try {
      await reimbursementService.submit(data.reimbursement_id);
      message.success('已提交');
      fetchData();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '提交失败');
    }
  };

  const handleCancel = () => {
    if (!data) return;
    modal.confirm({
      title: '撤销报销单',
      content: `确认撤销报销单 ${data.reimbursement_number}？`,
      okText: '确认撤销',
      okType: 'danger',
      cancelText: '返回',
      onOk: async () => {
        try {
          await reimbursementService.cancel(data.reimbursement_id, '申请人主动撤销');
          message.success('已撤销');
          fetchData();
        } catch (e: any) {
          message.error(e?.response?.data?.message || '撤销失败');
        }
      },
    });
  };

  const previewInvoice = async (key?: string) => {
    if (!key) return;
    try {
      const res = await api.get('/upload/signed-url', { params: { key } });
      const url = res.data?.data?.url;
      if (url) window.open(url, '_blank');
      else message.warning('无法生成预览链接');
    } catch {
      message.error('获取预览链接失败');
    }
  };

  if (loading || !data) {
    return <Card><Skeleton active /></Card>;
  }

  const meta = STATUS_LABELS[data.status] || { text: data.status, color: 'default' };
  const isOwner = user?.employee_id === data.employee_id;
  const canEdit = ['draft', 'rejected'].includes(data.status) && (isOwner || isFinance);
  const canSubmit = ['draft', 'rejected'].includes(data.status) && (isOwner || isFinance);
  const canCancel = ['pending', 'approved'].includes(data.status) && (isOwner || isFinance);
  const canApprove = isFinance && data.status === 'pending';
  const canPay = isFinance && data.status === 'approved';

  const itemColumns = [
    {
      title: '类别',
      dataIndex: 'category',
      width: 120,
      render: (c: ReimbursementCategory) => CATEGORY_LABELS[c] || c,
    },
    {
      title: '发生日期',
      dataIndex: 'occurred_on',
      width: 120,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 100,
      render: (v: number) => `¥${Number(v).toFixed(2)}`,
    },
    {
      title: '说明',
      dataIndex: 'description',
      render: (v?: string) => v || '-',
    },
    {
      title: '发票',
      width: 140,
      render: (_: any, r: any) => (
        r.invoice_key
          ? (
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => previewInvoice(r.invoice_key)}
            >
              {r.invoice_name || '预览'}
            </Button>
          )
          : <Text type="secondary">未上传</Text>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={(
          <Space>
            <span>报销单详情</span>
            <Tag color={meta.color}>{meta.text}</Tag>
          </Space>
        )}
        extra={(
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/reimbursements')}
            >
              返回列表
            </Button>
            {canEdit && (
              <Button
                icon={<EditOutlined />}
                onClick={() => navigate(`/reimbursements/${data.reimbursement_id}/edit`)}
              >
                编辑
              </Button>
            )}
            {canSubmit && data.status === 'draft' && (
              <Button type="primary" onClick={handleSubmit}>提交审核</Button>
            )}
            {canCancel && (
              <Button danger icon={<CloseCircleOutlined />} onClick={handleCancel}>撤销</Button>
            )}
          </Space>
        )}
      >
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="报销单号">{data.reimbursement_number}</Descriptions.Item>
          <Descriptions.Item label="员工">
            {data.employee
              ? `${data.employee.employee_number} ${data.employee.name || ''}`
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="关联出差单">
            {data.trip ? (
              <Button
                type="link"
                size="small"
                onClick={() => navigate(`/business-trips/${data.trip!.trip_id}`)}
              >
                {data.trip.trip_number} · {data.trip.destination}
              </Button>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="出差期间">
            {data.trip
              ? `${dayjs(data.trip.start_datetime).format('YYYY-MM-DD HH:mm')} ~ ${dayjs(data.trip.end_datetime).format('YYYY-MM-DD HH:mm')}`
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="备注" span={2}>{data.notes || '-'}</Descriptions.Item>
        </Descriptions>

        <Divider orientation="left">汇总</Divider>
        <Row gutter={16}>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="总金额"
                value={Number(data.total_amount)}
                prefix="¥"
                precision={2}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="明细条数"
                value={data.items?.length || 0}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="提交时间"
                value={data.submitted_at ? dayjs(data.submitted_at).format('YYYY-MM-DD') : '-'}
              />
            </Card>
          </Col>
        </Row>

        <Divider orientation="left">费用明细</Divider>
        <Table
          rowKey="item_id"
          size="small"
          dataSource={data.items}
          columns={itemColumns as any}
          pagination={false}
        />

        <Divider orientation="left">审核与发放</Divider>
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="提交人">
            {data.submitter?.display_name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="提交时间">
            {data.submitted_at ? dayjs(data.submitted_at).format('YYYY-MM-DD HH:mm') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="审核人">
            {data.approver?.display_name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="审核时间">
            {data.approved_at ? dayjs(data.approved_at).format('YYYY-MM-DD HH:mm') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="审核意见" span={2}>
            {data.approval_notes || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="发放人">{data.payer?.display_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="发放时间">
            {data.paid_at ? dayjs(data.paid_at).format('YYYY-MM-DD HH:mm') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="发放凭证" span={2}>
            {data.payment_reference || '-'}
          </Descriptions.Item>
          {data.cancelled_at && (
            <>
              <Descriptions.Item label="撤销人">
                {data.canceller?.display_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="撤销时间">
                {dayjs(data.cancelled_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="撤销原因" span={2}>
                {data.cancellation_reason || '-'}
              </Descriptions.Item>
            </>
          )}
        </Descriptions>

        {(canApprove || canPay) && (
          <>
            <Divider orientation="left">操作</Divider>
            <Space>
              {canApprove && (
                <>
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={() => setDecision('approved')}
                  >
                    审核通过
                  </Button>
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={() => setDecision('rejected')}
                  >
                    驳回
                  </Button>
                </>
              )}
              {canPay && (
                <Button
                  type="primary"
                  icon={<DollarOutlined />}
                  onClick={() => setPayRefOpen(true)}
                >
                  标记已发放
                </Button>
              )}
            </Space>
          </>
        )}
      </Card>

      <Modal
        title={decision === 'approved' ? '审核通过' : '驳回报销单'}
        open={Boolean(decision)}
        confirmLoading={busy}
        onOk={handleDecision}
        onCancel={() => {
          setDecision(null);
          setNotes('');
        }}
      >
        <p>{decision === 'approved' ? '确认审核通过？' : '请填写驳回原因'}</p>
        <TextArea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={decision === 'rejected' ? '请填写驳回原因' : '审核意见（选填）'}
        />
      </Modal>

      <Modal
        title="标记已发放"
        open={payRefOpen}
        confirmLoading={busy}
        onOk={handlePay}
        onCancel={() => setPayRefOpen(false)}
      >
        <p>请输入发放凭证号（银行流水号、转账单号等）</p>
        <Input
          value={paymentRef}
          onChange={(e) => setPaymentRef(e.target.value)}
          placeholder="选填"
        />
      </Modal>
    </div>
  );
};

export default ReimbursementDetailPage;
