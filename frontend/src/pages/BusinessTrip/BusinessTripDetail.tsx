/**
 * BusinessTripDetail - 出差申请详情 + 审批面板
 *
 * 普通员工：只读 + 撤销
 * 管理者：可在 pending 状态下进行审批（通过/拒绝）
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Space,
  Button,
  App,
  Input,
  Modal,
  List,
  Skeleton,
  Divider,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const { TextArea } = Input;

interface Attachment {
  object_key: string;
  name: string;
  type: string;
  uploaded_at: string;
}

interface TripDetail {
  trip_id: string;
  trip_number: string;
  employee_id: string;
  employee?: { employee_number: string; name: string };
  start_datetime: string;
  end_datetime: string;
  destination: string;
  itinerary?: string;
  purpose?: string;
  transport?: string;
  duration_hours: number;
  work_hours: number;
  span_days: number;
  attachments: Attachment[];
  status: string;
  submitted_at?: string;
  submitter?: { display_name: string } | null;
  approver?: { display_name: string } | null;
  approved_at?: string;
  approval_notes?: string;
  cancelled_at?: string;
  canceller?: { display_name: string } | null;
  cancellation_reason?: string;
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

const BusinessTripDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { message, modal } = App.useApp();

  const isApprover = ['admin', 'hr_admin', 'department_manager'].includes(
    user?.role || ''
  );

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState<null | 'approved' | 'rejected'>(null);
  const [approveNotes, setApproveNotes] = useState('');

  const fetchTrip = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/business-trips/${id}`);
      if (res.data.success) setTrip(res.data.data);
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载出差详情失败');
    } finally {
      setLoading(false);
    }
  }, [id, message]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  const handleApprove = async () => {
    if (!trip || !showApproveModal) return;
    setApproving(true);
    try {
      await api.post(`/business-trips/${trip.trip_id}/approve`, {
        decision: showApproveModal,
        notes: approveNotes,
      });
      message.success(showApproveModal === 'approved' ? '已批准' : '已拒绝');
      setShowApproveModal(null);
      setApproveNotes('');
      fetchTrip();
    } catch (error: any) {
      message.error(error.response?.data?.message || '审批失败');
    } finally {
      setApproving(false);
    }
  };

  const handleCancel = () => {
    if (!trip) return;
    modal.confirm({
      title: '撤销出差申请',
      content: `确认撤销 ${trip.trip_number}？已批准的申请会同时清除考勤"出差"状态。`,
      okText: '确认撤销',
      okType: 'danger',
      cancelText: '返回',
      onOk: async () => {
        try {
          await api.post(`/business-trips/${trip.trip_id}/cancel`, {
            reason: '申请人主动撤销',
          });
          message.success('已撤销');
          fetchTrip();
        } catch (error: any) {
          message.error(error.response?.data?.message || '撤销失败');
        }
      },
    });
  };

  const previewAttachment = async (objectKey: string) => {
    try {
      const res = await api.get('/upload/signed-url', { params: { key: objectKey } });
      const url = res.data?.data?.url;
      if (url) {
        window.open(url, '_blank');
      } else {
        message.warning('无法获取附件链接');
      }
    } catch {
      message.error('获取附件链接失败');
    }
  };

  if (loading || !trip) {
    return (
      <Card>
        <Skeleton active />
      </Card>
    );
  }

  const statusMeta = STATUS_LABELS[trip.status] || { text: trip.status, color: 'default' };
  const isOwner = user?.employee_id === trip.employee_id;
  const canEdit = ['draft', 'pending', 'rejected'].includes(trip.status) && (isOwner || isApprover);
  const canCancel = ['pending', 'approved', 'in_progress'].includes(trip.status) && (isOwner || isApprover);
  const canApprove = isApprover && trip.status === 'pending';

  return (
    <div>
      <Card
        title={
          <Space>
            <span>出差申请详情</span>
            <Tag color={statusMeta.color}>{statusMeta.text}</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/business-trips')}
            >
              返回列表
            </Button>
            {canEdit && (
              <Button
                icon={<EditOutlined />}
                onClick={() => navigate(`/business-trips/${trip.trip_id}/edit`)}
              >
                编辑
              </Button>
            )}
            {canCancel && (
              <Button danger icon={<CloseCircleOutlined />} onClick={handleCancel}>
                撤销
              </Button>
            )}
          </Space>
        }
      >
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="出差单号">{trip.trip_number}</Descriptions.Item>
          <Descriptions.Item label="员工">
            {trip.employee
              ? `${trip.employee.employee_number} ${trip.employee.name || ''}`
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="开始时间">
            {dayjs(trip.start_datetime).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="结束时间">
            {dayjs(trip.end_datetime).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="目的地" span={2}>
            {trip.destination}
          </Descriptions.Item>
          <Descriptions.Item label="交通方式">{trip.transport || '-'}</Descriptions.Item>
          <Descriptions.Item label="出差事由">{trip.purpose || '-'}</Descriptions.Item>
          <Descriptions.Item label="行程说明" span={2}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
              {trip.itinerary || '-'}
            </pre>
          </Descriptions.Item>
        </Descriptions>

        <Divider orientation="left">时长统计</Divider>
        <Row gutter={16}>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="总时长"
                value={Number(trip.duration_hours)}
                suffix="小时"
                precision={2}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="计入工时"
                value={Number(trip.work_hours)}
                suffix="小时"
                precision={2}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="跨越天数"
                value={Number(trip.span_days)}
                suffix="天"
                precision={2}
              />
            </Card>
          </Col>
        </Row>

        <Divider orientation="left">附件</Divider>
        <List
          size="small"
          locale={{ emptyText: '暂无附件' }}
          dataSource={trip.attachments}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  key="preview"
                  type="link"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => previewAttachment(item.object_key)}
                >
                  预览
                </Button>,
              ]}
            >
              <Tag color="blue">{item.name}</Tag>
              <span style={{ color: '#999', fontSize: 12 }}>
                上传于 {dayjs(item.uploaded_at).format('YYYY-MM-DD HH:mm')}
              </span>
            </List.Item>
          )}
        />

        <Divider orientation="left">审批信息</Divider>
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="提交人">
            {trip.submitter?.display_name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="提交时间">
            {trip.submitted_at ? dayjs(trip.submitted_at).format('YYYY-MM-DD HH:mm') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="审批人">
            {trip.approver?.display_name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="审批时间">
            {trip.approved_at ? dayjs(trip.approved_at).format('YYYY-MM-DD HH:mm') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="审批意见" span={2}>
            {trip.approval_notes || '-'}
          </Descriptions.Item>
          {trip.cancelled_at && (
            <>
              <Descriptions.Item label="撤销人">
                {trip.canceller?.display_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="撤销时间">
                {dayjs(trip.cancelled_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="撤销原因" span={2}>
                {trip.cancellation_reason || '-'}
              </Descriptions.Item>
            </>
          )}
        </Descriptions>

        {canApprove && (
          <>
            <Divider orientation="left">审批操作</Divider>
            <Space>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => setShowApproveModal('approved')}
              >
                批准
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => setShowApproveModal('rejected')}
              >
                拒绝
              </Button>
            </Space>
          </>
        )}
      </Card>

      <Modal
        open={Boolean(showApproveModal)}
        title={showApproveModal === 'approved' ? '批准出差申请' : '拒绝出差申请'}
        okText="确认"
        cancelText="取消"
        confirmLoading={approving}
        onOk={handleApprove}
        onCancel={() => {
          setShowApproveModal(null);
          setApproveNotes('');
        }}
      >
        <p style={{ marginBottom: 8 }}>
          {showApproveModal === 'approved'
            ? '批准后系统将自动覆盖出差期间的考勤记录为"出差"状态，并计入工时统计。'
            : '请填写拒绝原因，员工修改后可重新提交。'}
        </p>
        <TextArea
          rows={4}
          value={approveNotes}
          maxLength={500}
          showCount
          placeholder={showApproveModal === 'rejected' ? '请填写拒绝原因' : '审批意见（选填）'}
          onChange={(e) => setApproveNotes(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default BusinessTripDetail;
