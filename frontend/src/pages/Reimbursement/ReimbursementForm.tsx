/**
 * ReimbursementForm - 创建/编辑报销单
 *
 * 流程：
 *  1. 选择出差单（仅 approved/in_progress/completed 可关联）
 *  2. 录入费用明细：类别 / 日期 / 金额 / 说明 / 发票
 *  3. 客户端预校验：日期落在出差范围、按天住宿/餐补限额
 *  4. 保存草稿 / 直接提交
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Card, Form, Select, InputNumber, DatePicker, Input, Button, Space, Table,
  App, Upload, Alert, Typography,
} from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import api from '../../services/api';
import {
  reimbursementService,
  ReimbursementCategory,
  ReimbursementLimits,
} from '../../services/reimbursementService';

const { Text } = Typography;

const CATEGORY_LABELS: Record<ReimbursementCategory, string> = {
  transport: '长途交通',
  accommodation: '住宿',
  meal: '餐费',
  local_transport: '市内交通',
  other: '其他',
};

interface FormItem {
  key: string;
  category: ReimbursementCategory;
  amount: number;
  occurred_on: Dayjs | null;
  description?: string;
  invoice_key?: string;
  invoice_name?: string;
}

interface TripOption {
  trip_id: string;
  trip_number: string;
  destination: string;
  start_datetime: string;
  end_datetime: string;
  status: string;
  employee?: { employee_id: string; employee_number: string; name: string };
}

const blankItem = (): FormItem => ({
  key: Math.random().toString(36).slice(2),
  category: 'transport',
  amount: 0,
  occurred_on: null,
});

const ReimbursementForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [trips, setTrips] = useState<TripOption[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<TripOption | null>(null);
  const [items, setItems] = useState<FormItem[]>([blankItem()]);
  const [limits, setLimits] = useState<ReimbursementLimits | null>(null);
  const [violations, setViolations] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');

  const fetchTrips = useCallback(async () => {
    try {
      const res = await api.get('/business-trips', {
        params: { size: 100, status: 'approved' },
      });
      const inProg = await api.get('/business-trips', {
        params: { size: 100, status: 'in_progress' },
      });
      const all: TripOption[] = [
        ...(res.data.data || []),
        ...(inProg.data.data || []),
      ];
      setTrips(all);
    } catch {
      message.warning('加载可关联的出差单失败');
    }
  }, [message]);

  const fetchLimits = useCallback(async () => {
    try {
      const lim = await reimbursementService.getLimits();
      setLimits(lim);
    } catch {
      // 静默
    }
  }, []);

  const loadExisting = useCallback(async () => {
    if (!id) return;
    try {
      const detail = await reimbursementService.getById(id);
      form.setFieldsValue({ trip_id: detail.trip_id });
      setNotes(detail.notes || '');
      setItems(
        detail.items.map((it) => ({
          key: it.item_id || Math.random().toString(36).slice(2),
          category: it.category,
          amount: Number(it.amount),
          occurred_on: it.occurred_on ? dayjs(it.occurred_on) : null,
          description: it.description,
          invoice_key: it.invoice_key,
          invoice_name: it.invoice_name,
        })),
      );
      // 反向匹配出差单
      if (detail.trip) {
        setSelectedTrip({
          trip_id: detail.trip.trip_id,
          trip_number: detail.trip.trip_number,
          destination: detail.trip.destination,
          start_datetime: detail.trip.start_datetime,
          end_datetime: detail.trip.end_datetime,
          status: detail.trip.status || '',
          employee: detail.employee,
        });
      }
    } catch (e: any) {
      message.error(e?.response?.data?.message || '加载报销单失败');
    }
  }, [id, form, message]);

  useEffect(() => {
    fetchTrips();
    fetchLimits();
    if (isEdit) loadExisting();
  }, [fetchTrips, fetchLimits, isEdit, loadExisting]);

  // 客户端限额校验
  useEffect(() => {
    if (!limits) return;
    const acc: Record<string, number> = {};
    const meal: Record<string, number> = {};
    items.forEach((it) => {
      if (!it.occurred_on) return;
      const d = it.occurred_on.format('YYYY-MM-DD');
      if (it.category === 'accommodation') acc[d] = (acc[d] || 0) + Number(it.amount);
      if (it.category === 'meal') meal[d] = (meal[d] || 0) + Number(it.amount);
    });
    const violMsgs: string[] = [];
    Object.entries(acc).forEach(([d, t]) => {
      if (t > limits.daily_limits.accommodation) {
        violMsgs.push(`${d} 住宿合计 ¥${t.toFixed(2)}，超过上限 ¥${limits.daily_limits.accommodation}`);
      }
    });
    Object.entries(meal).forEach(([d, t]) => {
      if (t > limits.daily_limits.meal) {
        violMsgs.push(`${d} 餐费合计 ¥${t.toFixed(2)}，超过上限 ¥${limits.daily_limits.meal}`);
      }
    });
    setViolations(violMsgs);
  }, [items, limits]);

  const handleTripChange = (tripId: string) => {
    const trip = trips.find((t) => t.trip_id === tripId) || null;
    setSelectedTrip(trip);
  };

  const handleAddItem = () => setItems((prev) => [...prev, blankItem()]);

  const handleRemoveItem = (key: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.key !== key) : prev));
  };

  const updateItem = (key: string, patch: Partial<FormItem>) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  };

  const handleInvoiceUpload = async (key: string, file: File) => {
    try {
      const target = isEdit && id ? id : 'draft';
      const result = await reimbursementService.uploadInvoice(target, file);
      updateItem(key, {
        invoice_key: result.object_key,
        invoice_name: result.name,
      });
      message.success('发票已上传');
    } catch (e: any) {
      message.error(e?.response?.data?.message || '上传失败');
    }
    return false;
  };

  const total = items.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);

  const submit = async (mode: 'draft' | 'submit') => {
    if (!selectedTrip) {
      message.warning('请选择关联的出差单');
      return;
    }
    if (items.length === 0) {
      message.warning('至少添加一条费用明细');
      return;
    }
    const tripStart = dayjs(selectedTrip.start_datetime).format('YYYY-MM-DD');
    const tripEnd = dayjs(selectedTrip.end_datetime).format('YYYY-MM-DD');
    for (const it of items) {
      if (!it.occurred_on) {
        message.warning('明细需填写发生日期');
        return;
      }
      const d = it.occurred_on.format('YYYY-MM-DD');
      if (d < tripStart || d > tripEnd) {
        message.warning(`日期 ${d} 不在出差期间 ${tripStart} ~ ${tripEnd}`);
        return;
      }
      if (!Number.isFinite(it.amount) || it.amount <= 0) {
        message.warning('金额需大于 0');
        return;
      }
    }
    if (mode === 'submit' && violations.length > 0) {
      message.warning('请先解决限额超出问题再提交');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        trip_id: selectedTrip.trip_id,
        items: items.map((i) => ({
          category: i.category,
          amount: Number(i.amount),
          occurred_on: i.occurred_on!.format('YYYY-MM-DD'),
          description: i.description,
          invoice_key: i.invoice_key,
          invoice_name: i.invoice_name,
        })),
        notes,
        submit: mode === 'submit',
      };
      if (isEdit && id) {
        await reimbursementService.update(id, {
          items: payload.items,
          notes: payload.notes,
        });
        if (mode === 'submit') {
          await reimbursementService.submit(id);
        }
        message.success(mode === 'submit' ? '已提交' : '已保存草稿');
        navigate(`/reimbursements/${id}`);
      } else {
        const created = await reimbursementService.create(payload);
        message.success(mode === 'submit' ? '已提交' : '已保存草稿');
        navigate(`/reimbursements/${created.reimbursement_id}`);
      }
    } catch (e: any) {
      const detail = e?.response?.data;
      if (detail?.details?.violations) {
        const vs = detail.details.violations as Array<{
          category: string; date: string; total: number; limit: number;
        }>;
        message.error(vs.map((v) => `${v.date} ${v.category} 超额 ¥${v.total} > ¥${v.limit}`).join('；'));
      } else {
        message.error(detail?.message || '保存失败');
      }
    } finally {
      setSaving(false);
    }
  };

  const itemColumns = [
    {
      title: '类别',
      width: 140,
      render: (_: any, r: FormItem) => (
        <Select
          style={{ width: '100%' }}
          value={r.category}
          options={Object.entries(CATEGORY_LABELS).map(([v, l]) => ({
            value: v, label: l,
          }))}
          onChange={(v) => updateItem(r.key, { category: v as ReimbursementCategory })}
        />
      ),
    },
    {
      title: '发生日期',
      width: 160,
      render: (_: any, r: FormItem) => (
        <DatePicker
          style={{ width: '100%' }}
          value={r.occurred_on}
          disabledDate={(d) => {
            if (!selectedTrip || !d) return false;
            return (
              d.isBefore(dayjs(selectedTrip.start_datetime).startOf('day'))
              || d.isAfter(dayjs(selectedTrip.end_datetime).endOf('day'))
            );
          }}
          onChange={(d) => updateItem(r.key, { occurred_on: d })}
        />
      ),
    },
    {
      title: '金额',
      width: 120,
      render: (_: any, r: FormItem) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          step={0.01}
          precision={2}
          value={r.amount}
          onChange={(v) => updateItem(r.key, { amount: Number(v || 0) })}
        />
      ),
    },
    {
      title: '说明',
      render: (_: any, r: FormItem) => (
        <Input
          value={r.description}
          placeholder="车次/酒店/餐厅等"
          onChange={(e) => updateItem(r.key, { description: e.target.value })}
        />
      ),
    },
    {
      title: '发票',
      width: 200,
      render: (_: any, r: FormItem) => (
        <Space>
          <Upload
            accept="image/*,application/pdf"
            showUploadList={false}
            beforeUpload={(file) => handleInvoiceUpload(r.key, file)}
          >
            <Button size="small" icon={<UploadOutlined />}>
              {r.invoice_key ? '替换' : '上传'}
            </Button>
          </Upload>
          {r.invoice_key && (
            <Text style={{ fontSize: 12 }} ellipsis={{ tooltip: r.invoice_name }}>
              {r.invoice_name || '已上传'}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '操作',
      width: 80,
      render: (_: any, r: FormItem) => (
        <Button
          type="link"
          size="small"
          danger
          icon={<DeleteOutlined />}
          disabled={items.length === 1}
          onClick={() => handleRemoveItem(r.key)}
        />
      ),
    },
  ];

  return (
    <Card
      title={isEdit ? '编辑报销单' : '新建报销单'}
      extra={(
        <Space>
          <Button onClick={() => navigate('/reimbursements')}>取消</Button>
          <Button
            icon={<SaveOutlined />}
            loading={saving}
            onClick={() => submit('draft')}
          >
            保存草稿
          </Button>
          <Button
            type="primary"
            loading={saving}
            disabled={violations.length > 0}
            onClick={() => submit('submit')}
          >
            提交审核
          </Button>
        </Space>
      )}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="关联出差单" name="trip_id" rules={[{ required: true }]}>
          <Select
            placeholder="选择已批准的出差单"
            disabled={isEdit}
            showSearch
            optionFilterProp="label"
            onChange={handleTripChange}
            options={trips.map((t) => {
              const empLabel = t.employee
                ? `${t.employee.employee_number} ${t.employee.name || ''}`
                : '';
              return {
                value: t.trip_id,
                label: `${t.trip_number} · ${empLabel} · ${t.destination} (${dayjs(t.start_datetime).format('MM-DD')} ~ ${dayjs(t.end_datetime).format('MM-DD')})`,
              };
            })}
          />
        </Form.Item>

        {selectedTrip && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={(
              <span>
                {selectedTrip.employee && (
                  <>报销人：{selectedTrip.employee.employee_number} {selectedTrip.employee.name}<br /></>
                )}
                出差期间：{dayjs(selectedTrip.start_datetime).format('YYYY-MM-DD HH:mm')}
                {' ~ '}
                {dayjs(selectedTrip.end_datetime).format('YYYY-MM-DD HH:mm')}
              </span>
            )}
            description={
              limits
                ? `限额：住宿 ¥${limits.daily_limits.accommodation}/天，餐费 ¥${limits.daily_limits.meal}/天`
                : ''
            }
          />
        )}

        {violations.length > 0 && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message="存在超额明细"
            description={(
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {violations.map((v) => <li key={v}>{v}</li>)}
              </ul>
            )}
          />
        )}

        <Space style={{ marginBottom: 12 }}>
          <Button icon={<PlusOutlined />} onClick={handleAddItem}>
            添加费用明细
          </Button>
          <Text strong>合计：¥{total.toFixed(2)}</Text>
        </Space>

        <Table
          rowKey="key"
          dataSource={items}
          columns={itemColumns as any}
          pagination={false}
          size="small"
        />

        <Form.Item label="备注" style={{ marginTop: 16 }}>
          <Input.TextArea
            rows={2}
            value={notes}
            maxLength={500}
            showCount
            onChange={(e) => setNotes(e.target.value)}
          />
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ReimbursementForm;
