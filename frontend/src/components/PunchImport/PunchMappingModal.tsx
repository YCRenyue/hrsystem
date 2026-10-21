/**
 * PunchMappingModal - 查看与删除打卡机工号对照
 */

import React, { useCallback, useEffect, useState } from 'react';
import { App, Button, Modal, Popconfirm, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PunchDeviceType, PunchMapping, punchService } from '../../services/punchService';

interface Props {
  deviceType: PunchDeviceType;
  open: boolean;
  onClose: () => void;
}

const PunchMappingModal: React.FC<Props> = ({ deviceType, open, onClose }) => {
  const { message } = App.useApp();
  const [rows, setRows] = useState<PunchMapping[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await punchService.listMappings(deviceType));
    } catch (e) {
      console.error(e);
      message.error('加载对照表失败');
    } finally {
      setLoading(false);
    }
  }, [deviceType, message]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleDelete = async (mappingId: string) => {
    try {
      await punchService.deleteMapping(mappingId);
      message.success('已删除');
      load();
    } catch (e) {
      console.error(e);
      message.error('删除失败');
    }
  };

  const columns: ColumnsType<PunchMapping> = [
    { title: '机器工号', dataIndex: 'external_id', key: 'external_id', width: 100 },
    { title: '打卡机姓名', dataIndex: 'external_name', key: 'external_name', width: 120 },
    {
      title: '对应员工',
      key: 'employee',
      render: (_, r) => (r.employee
        ? `${r.employee.name || '-'}（${r.employee.employee_number || '-'}）`
        : '员工已删除'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 90,
      render: (_, r) => (
        <Popconfirm title="确定删除该对照？" onConfirm={() => handleDelete(r.mapping_id)}>
          <Button type="link" danger size="small">删除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title={deviceType === 'canteen' ? '食堂机工号对照表' : '考勤机工号对照表'}
      width={640}
      onCancel={onClose}
      footer={null}
    >
      <p style={{ color: '#999' }}>
        导入时先按这里的对照匹配员工，没有对照再按姓名匹配。新的对照可以在导入结果里直接添加。
      </p>
      <Table
        columns={columns}
        rowKey="mapping_id"
        dataSource={rows}
        loading={loading}
        size="small"
        pagination={{ pageSize: 10 }}
      />
    </Modal>
  );
};

export default PunchMappingModal;
