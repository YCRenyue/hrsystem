/**
 * BusinessTripForm - 出差申请的创建/编辑表单
 *
 * 支持：
 *  - 时间选择（精确到分钟）
 *  - 行程、目的地、交通方式、事由
 *  - 附件上传（行程单、发票、水印照片）
 *  - 提交前查询冲突（已批假/同时段已有出差）
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Card,
  Space,
  App,
  Statistic,
  Row,
  Col,
  Alert,
  Upload,
  List,
  Tag,
} from 'antd';
import {
  SaveOutlined,
  ArrowLeftOutlined,
  UploadOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface EmployeeOption {
  employee_id: string;
  employee_number: string;
  name: string;
}

interface Attachment {
  object_key: string;
  name: string;
  type: string;
  uploaded_at: string;
  url?: string | null;
}

interface ConflictItem {
  id: string;
  description: string;
}

const TRANSPORT_OPTIONS = [
  { value: '飞机', label: '飞机' },
  { value: '高铁', label: '高铁' },
  { value: '火车', label: '火车' },
  { value: '汽车', label: '长途汽车' },
  { value: '自驾', label: '自驾' },
  { value: '其他', label: '其他' },
];

const BusinessTripForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const isApprover = ['admin', 'hr_admin', 'department_manager'].includes(
    user?.role || ''
  );

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [durations, setDurations] = useState({
    duration_hours: 0,
    work_hours: 0,
    span_days: 0,
  });
  const [conflicts, setConflicts] = useState<{
    leaves: ConflictItem[];
    trips: ConflictItem[];
  }>({ leaves: [], trips: [] });

  const fetchEmployees = useCallback(async () => {
    if (!isApprover) return;
    try {
      const response = await api.get('/employees', {
        params: { page: 1, size: 500, _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (response.data.success) {
        const payload = response.data.data;
        const list = Array.isArray(payload) ? payload : payload?.items || [];
        setEmployees(
          list.map((e: any) => ({
            employee_id: e.employee_id,
            employee_number: e.employee_number,
            name: e.name || e.employee_name || '',
          }))
        );
      }
    } catch {
      message.error('获取员工列表失败');
    }
  }, [isApprover, message]);

  const fetchTrip = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await api.get(`/business-trips/${id}`);
      if (response.data.success) {
        const trip = response.data.data;
        form.setFieldsValue({
          employee_id: trip.employee_id,
          range: [
            dayjs(trip.start_datetime),
            dayjs(trip.end_datetime),
          ],
          destination: trip.destination,
          itinerary: trip.itinerary,
          purpose: trip.purpose,
          transport: trip.transport,
        });
        setDurations({
          duration_hours: Number(trip.duration_hours) || 0,
          work_hours: Number(trip.work_hours) || 0,
          span_days: Number(trip.span_days) || 0,
        });
        setAttachments(trip.attachments || []);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载出差申请失败');
    } finally {
      setLoading(false);
    }
  }, [id, form, message]);

  useEffect(() => {
    fetchEmployees();
    fetchTrip();
  }, [fetchEmployees, fetchTrip]);

  /**
   * 计算工时预估（前端先粗算给即时反馈，最终以服务端计算为准）
   */
  const recalcDurations = useCallback((range?: [Dayjs, Dayjs]) => {
    if (!range || !range[0] || !range[1]) {
      setDurations({ duration_hours: 0, work_hours: 0, span_days: 0 });
      return;
    }
    const [start, end] = range;
    if (!end.isAfter(start)) return;

    const totalMinutes = end.diff(start, 'minute');
    const durationHours = Number((totalMinutes / 60).toFixed(2));

    let workHours = 0;
    let spanDays = 0;
    let cursor = start.startOf('day');
    const lastDay = end.startOf('day');
    let safety = 0;

    while (cursor.isBefore(lastDay) || cursor.isSame(lastDay, 'day')) {
      safety += 1;
      if (safety > 366) break;

      const segStart = cursor.isSame(start, 'day') ? start : cursor;
      const segEndCandidate = cursor.endOf('day');
      const segEnd = segEndCandidate.isAfter(end) ? end : segEndCandidate;
      const minutes = segEnd.diff(segStart, 'minute');
      const hours = minutes / 60;
      spanDays += Math.min(hours / 24, 1);

      const day = cursor.day();
      const isWeekend = day === 0 || day === 6;
      if (!isWeekend) {
        workHours += Math.min(hours, 8);
      }
      cursor = cursor.add(1, 'day');
    }

    setDurations({
      duration_hours: durationHours,
      work_hours: Number(workHours.toFixed(2)),
      span_days: Number(spanDays.toFixed(2)),
    });
  }, []);

  const checkConflicts = useCallback(async () => {
    const range = form.getFieldValue('range') as [Dayjs, Dayjs] | undefined;
    const employeeId =
      form.getFieldValue('employee_id') ||
      (!isApprover ? user?.employee_id : undefined);
    if (!range?.[0] || !range[1] || !employeeId) {
      setConflicts({ leaves: [], trips: [] });
      return;
    }
    try {
      const res = await api.get('/business-trips/conflicts/check', {
        params: {
          employee_id: employeeId,
          start_datetime: range[0].format('YYYY-MM-DDTHH:mm:ss'),
          end_datetime: range[1].format('YYYY-MM-DDTHH:mm:ss'),
          exclude_trip_id: id,
        },
      });
      if (res.data.success) {
        const { conflictLeaves, conflictTrips } = res.data.data;
        setConflicts({
          leaves: conflictLeaves.map((l: any) => ({
            id: l.leave_id,
            description: `${l.start_date} ~ ${l.end_date}（${l.leave_type}, ${l.days}天）`,
          })),
          trips: conflictTrips.map((t: any) => ({
            id: t.trip_id,
            description: `${t.trip_number}：${dayjs(t.start_datetime).format('MM-DD HH:mm')} ~ ${dayjs(t.end_datetime).format('MM-DD HH:mm')}（${t.status}）`,
          })),
        });
      }
    } catch {
      // 静默失败，不阻塞编辑
    }
  }, [form, id, isApprover, user]);

  const onValuesChange = (_: any, allValues: any) => {
    if (allValues.range) {
      recalcDurations(allValues.range);
      checkConflicts();
    }
  };

  const handleUpload = async (file: File) => {
    const tripIdForUpload = id || 'draft';
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post(
        `/upload/business-trip/${tripIdForUpload}/file`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      if (res.data.success) {
        setAttachments((prev) => [...prev, res.data.data]);
        message.success(`${file.name} 上传成功`);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '附件上传失败');
    }
    return false;
  };

  const handleRemoveAttachment = (objectKey: string) => {
    setAttachments((prev) => prev.filter((a) => a.object_key !== objectKey));
  };

  const handlePreview = async (objectKey: string) => {
    try {
      const res = await api.get('/upload/signed-url', { params: { key: objectKey } });
      const url = res.data?.data?.url;
      if (url) {
        window.open(url, '_blank');
      } else {
        message.warning('无法获取附件预览链接');
      }
    } catch {
      message.error('获取附件链接失败');
    }
  };

  const handleSubmit = async (values: any, submit: boolean = true) => {
    if (conflicts.leaves.length > 0 || conflicts.trips.length > 0) {
      message.error('存在冲突，请先解决冲突再提交');
      return;
    }

    const [start, end] = values.range as [Dayjs, Dayjs];
    const payload = {
      employee_id: isApprover ? values.employee_id : undefined,
      start_datetime: start.format('YYYY-MM-DDTHH:mm:ss'),
      end_datetime: end.format('YYYY-MM-DDTHH:mm:ss'),
      destination: values.destination,
      itinerary: values.itinerary,
      purpose: values.purpose,
      transport: values.transport,
      attachments,
      submit,
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/business-trips/${id}`, payload);
        message.success('出差申请已更新');
      } else {
        await api.post('/business-trips', payload);
        message.success(submit ? '出差申请已提交，等待审批' : '草稿已保存');
      }
      navigate('/business-trips');
    } catch (error: any) {
      const detailMsg =
        error.response?.data?.message || error.response?.data?.error || '保存失败';
      message.error(detailMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const hasConflict =
    conflicts.leaves.length > 0 || conflicts.trips.length > 0;

  return (
    <div>
      <Card
        title={isEdit ? '编辑出差申请' : '新建出差申请'}
        loading={loading}
        extra={
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/business-trips')}
          >
            返回列表
          </Button>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onValuesChange={onValuesChange}
          onFinish={(v) => handleSubmit(v, true)}
          style={{ maxWidth: 720 }}
        >
          {isApprover && (
            <Form.Item
              label="出差员工"
              name="employee_id"
              rules={[{ required: true, message: '请选择出差员工' }]}
            >
              <Select
                showSearch
                placeholder="搜索员工姓名或工号"
                optionFilterProp="label"
                disabled={isEdit}
                onChange={() => checkConflicts()}
                options={employees.map((e) => ({
                  value: e.employee_id,
                  label: `${e.employee_number} - ${e.name}`,
                }))}
              />
            </Form.Item>
          )}

          <Form.Item
            label="出差时间"
            name="range"
            rules={[{ required: true, message: '请选择出差起止时间' }]}
            extra="精确到分钟，跨周末/节假日不计入工时"
          >
            <RangePicker
              showTime={{ format: 'HH:mm', minuteStep: 30 }}
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Card size="small" style={{ background: '#fafafa' }}>
                <Statistic
                  title="出差总时长"
                  value={durations.duration_hours}
                  suffix="小时"
                  precision={2}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" style={{ background: '#fafafa' }}>
                <Statistic
                  title="计入工时"
                  value={durations.work_hours}
                  suffix="小时"
                  precision={2}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" style={{ background: '#fafafa' }}>
                <Statistic
                  title="跨越天数"
                  value={durations.span_days}
                  suffix="天"
                  precision={2}
                />
              </Card>
            </Col>
          </Row>

          {hasConflict && (
            <Alert
              type="error"
              showIcon
              style={{ marginTop: 16 }}
              message="检测到时间冲突，无法提交"
              description={
                <div>
                  {conflicts.leaves.length > 0 && (
                    <div>
                      <strong>已批准的请假：</strong>
                      <ul>
                        {conflicts.leaves.map((l) => (
                          <li key={l.id}>{l.description}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {conflicts.trips.length > 0 && (
                    <div>
                      <strong>已有出差申请：</strong>
                      <ul>
                        {conflicts.trips.map((t) => (
                          <li key={t.id}>{t.description}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              }
            />
          )}

          <Form.Item
            label="目的地"
            name="destination"
            style={{ marginTop: 16 }}
            rules={[{ required: true, message: '请填写目的地' }]}
          >
            <Input placeholder="如：盱眙县人民医院、淮安区妇幼保健院" maxLength={200} />
          </Form.Item>

          <Form.Item label="行程说明" name="itinerary">
            <TextArea
              rows={4}
              maxLength={500}
              showCount
              placeholder="可填写多段行程，如&#10;8:23-8:52 盱眙恒硕血液透析中心&#10;9:18-11:06 盱眙县人民医院"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="主要交通方式" name="transport">
                <Select placeholder="请选择" options={TRANSPORT_OPTIONS} allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="出差事由" name="purpose">
                <Input placeholder="如：客户拜访、项目调研" maxLength={200} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="附件（行程单、发票、水印打卡照）">
            <Upload
              beforeUpload={handleUpload}
              showUploadList={false}
              accept="image/*"
            >
              <Button icon={<UploadOutlined />}>上传附件</Button>
            </Upload>
            <List
              size="small"
              style={{ marginTop: 8 }}
              dataSource={attachments}
              locale={{ emptyText: '暂无附件' }}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button
                      key="preview"
                      type="link"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => handlePreview(item.object_key)}
                    >
                      预览
                    </Button>,
                    <Button
                      key="del"
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveAttachment(item.object_key)}
                    >
                      删除
                    </Button>,
                  ]}
                >
                  <Tag color="blue">{item.name}</Tag>
                  <span style={{ color: '#999', fontSize: 12 }}>
                    {dayjs(item.uploaded_at).format('YYYY-MM-DD HH:mm')}
                  </span>
                </List.Item>
              )}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={submitting}
                disabled={hasConflict}
              >
                {isEdit ? '保存并提交' : '提交申请'}
              </Button>
              <Button
                onClick={() =>
                  form
                    .validateFields()
                    .then((v) => handleSubmit(v, false))
                    .catch(() => undefined)
                }
                loading={submitting}
              >
                保存草稿
              </Button>
              <Button onClick={() => navigate('/business-trips')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default BusinessTripForm;
