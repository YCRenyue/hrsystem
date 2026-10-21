/**
 * PunchUnmatchedTable - 导入结果中未匹配/待确认的人员，可直接建立工号对照
 */

import React, { useEffect, useState } from 'react';
import { App, Button, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  punchService,
  PunchDeviceType,
  PunchEmployeeBrief,
  PunchUnmatchedEntry,
} from '../../services/punchService';

interface Props {
  deviceType: PunchDeviceType;
  rows: PunchUnmatchedEntry[];
}

interface MappingCellProps {
  deviceType: PunchDeviceType;
  row: PunchUnmatchedEntry;
  options: PunchEmployeeBrief[];
}

/**
 * 员工显示文本：姓名（工号，部门）
 */
const employeeLabel = (e: PunchEmployeeBrief): string => {
  const parts = [e.employee_number, e.department_name].filter(Boolean).join('，');
  return parts ? `${e.name || '-'}（${parts}）` : e.name || '-';
};

const MappingCell: React.FC<MappingCellProps> = ({ deviceType, row, options }) => {
  const { message } = App.useApp();
  const [employeeId, setEmployeeId] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!employeeId) return;
    setSaving(true);
    try {
      await punchService.saveMapping({
        device_type: deviceType,
        external_id: row.external_id,
        external_name: row.name,
        employee_id: employeeId,
      });
      setSaved(true);
      message.success('对照已保存，重新导入后生效');
    } catch (e) {
      console.error(e);
      message.error('保存对照失败');
    } finally {
      setSaving(false);
    }
  };

  if (saved) return <Tag color="success">已建立对照</Tag>;
  return (
    <Space.Compact style={{ width: '100%' }}>
      <Select
        showSearch
        placeholder="选择对应员工"
        style={{ width: 240 }}
        value={employeeId}
        onChange={setEmployeeId}
        optionFilterProp="label"
        options={options.map((e) => ({ value: e.employee_id, label: employeeLabel(e) }))}
      />
      <Button type="primary" disabled={!employeeId} loading={saving} onClick={handleSave}>
        保存
      </Button>
    </Space.Compact>
  );
};

const PunchUnmatchedTable: React.FC<Props> = ({ deviceType, rows }) => {
  const [options, setOptions] = useState<PunchEmployeeBrief[]>([]);

  useEffect(() => {
    if (rows.length === 0) return;
    punchService.listEmployeeOptions().then(setOptions).catch(() => undefined);
  }, [rows.length]);

  const columns: ColumnsType<PunchUnmatchedEntry> = [
    { title: '机器工号', dataIndex: 'external_id', key: 'external_id', width: 90 },
    { title: '打卡机姓名', dataIndex: 'name', key: 'name', width: 110 },
    { title: '打卡天数', dataIndex: 'punch_days', key: 'punch_days', width: 90 },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 180,
      render: (v?: string) => v || '系统中找不到同名员工',
    },
    {
      title: '对应员工',
      key: 'mapping',
      render: (_, row) => <MappingCell deviceType={deviceType} row={row} options={options} />,
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={rows}
      rowKey={(r) => `${r.external_id}-${r.name}`}
      pagination={false}
      size="small"
      scroll={{ y: 260 }}
    />
  );
};

export default PunchUnmatchedTable;
