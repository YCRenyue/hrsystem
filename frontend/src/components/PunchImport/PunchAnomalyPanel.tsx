/**
 * PunchAnomalyPanel - 待复核的食堂刷卡
 *
 * 不在饭点、非工作日、请假/出差期间的刷卡不会自动计入用餐，
 * HR 在这里勾选后计为午餐/晚餐，或忽略。
 */

import React, { useCallback, useEffect, useState } from 'react';
import { App, Button, Segmented, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Dayjs } from 'dayjs';
import {
  ANOMALY_REASON_LABELS,
  AnomalyResolution,
  PunchAnomaly,
  punchService,
} from '../../services/punchService';

interface Props {
  range: [Dayjs, Dayjs] | null;
  /** 变化时重新加载（例如导入完成后） */
  refreshKey: number;
  onResolved: () => void;
}

type StatusFilter = 'pending' | 'resolved';

const RESOLUTION_LABELS: Record<AnomalyResolution, string> = {
  lunch: '计为午餐',
  dinner: '计为晚餐',
  ignore: '已忽略',
};

const PunchAnomalyPanel: React.FC<Props> = ({ range, refreshKey, onResolved }) => {
  const { message } = App.useApp();
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [rows, setRows] = useState<PunchAnomaly[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<React.Key[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await punchService.listAnomalies({
        device_type: 'canteen',
        status,
        start_date: range ? range[0].format('YYYY-MM-DD') : undefined,
        end_date: range ? range[1].format('YYYY-MM-DD') : undefined,
      });
      setRows(data);
      setSelected([]);
    } catch (e) {
      console.error(e);
      message.error('加载待复核刷卡失败');
    } finally {
      setLoading(false);
    }
  }, [status, range, message]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const resolve = async (resolution: AnomalyResolution) => {
    try {
      const result = await punchService.resolveAnomalies(selected as string[], resolution);
      message.success(`已处理 ${result.resolved} 条`);
      await load();
      if (resolution !== 'ignore') onResolved();
    } catch (e) {
      console.error(e);
      message.error('处理失败');
    }
  };

  const columns: ColumnsType<PunchAnomaly> = [
    { title: '日期', dataIndex: 'punch_date', key: 'punch_date', width: 120 },
    { title: '刷卡时间', dataIndex: 'punch_time', key: 'punch_time', width: 100 },
    {
      title: '员工',
      key: 'employee',
      width: 140,
      render: (_, r) => r.employee?.name || '-',
    },
    {
      title: '部门',
      key: 'department',
      width: 140,
      render: (_, r) => r.employee?.department_name || '-',
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 140,
      render: (v: string) => <Tag color="orange">{ANOMALY_REASON_LABELS[v] || v}</Tag>,
    },
    {
      title: '处理结果',
      dataIndex: 'resolution',
      key: 'resolution',
      render: (v: AnomalyResolution | null) => (v ? RESOLUTION_LABELS[v] : '-'),
    },
  ];

  const disabled = selected.length === 0;
  return (
    <>
      <Space wrap style={{ marginBottom: 12 }}>
        <Segmented
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
          options={[
            { label: '待处理', value: 'pending' },
            { label: '已处理', value: 'resolved' },
          ]}
        />
        {status === 'pending' && (
          <>
            <Button disabled={disabled} onClick={() => resolve('lunch')}>计为午餐</Button>
            <Button disabled={disabled} onClick={() => resolve('dinner')}>计为晚餐</Button>
            <Button disabled={disabled} danger onClick={() => resolve('ignore')}>忽略</Button>
            <span style={{ color: '#999' }}>已选 {selected.length} 条</span>
          </>
        )}
      </Space>
      <Table<PunchAnomaly>
        columns={columns}
        rowKey="anomaly_id"
        dataSource={rows}
        loading={loading}
        size="middle"
        pagination={{ pageSize: 20, showSizeChanger: true }}
        rowSelection={status === 'pending'
          ? { selectedRowKeys: selected, onChange: setSelected }
          : undefined}
      />
    </>
  );
};

export default PunchAnomalyPanel;
