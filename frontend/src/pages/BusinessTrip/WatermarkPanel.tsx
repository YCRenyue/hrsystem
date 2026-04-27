/**
 * WatermarkPanel - 出差水印打卡审核
 *
 * 功能：
 *  - 上传水印照片（要求 taken_at 在出差期间内）
 *  - 列出每天的打卡情况：缺卡日期 + 实际照片张数
 *  - 缺卡日提醒（红色标签）
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Card, Upload, Button, Table, Tag, Space, App, DatePicker, Empty, Alert,
} from 'antd';
import { UploadOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import api from '../../services/api';

interface WatermarkPhoto {
  object_key: string;
  name: string;
  type: string;
  uploaded_at: string;
  taken_at?: string;
  category?: string;
}

interface AuditResult {
  expected: string[];
  actual: Record<string, number>;
  missing: string[];
  total_photos: number;
  photos: WatermarkPhoto[];
}

interface WatermarkPanelProps {
  tripId: string;
  tripStart: string;
  tripEnd: string;
  canUpload: boolean;
}

const WatermarkPanel: React.FC<WatermarkPanelProps> = ({
  tripId, tripStart, tripEnd, canUpload,
}) => {
  const { message } = App.useApp();
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [takenAt, setTakenAt] = useState<Dayjs | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/business-trips/${tripId}/watermark/audit`);
      setAudit(res.data.data);
    } catch (e: any) {
      message.error(e?.response?.data?.message || '加载水印打卡失败');
    } finally {
      setLoading(false);
    }
  }, [tripId, message]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const previewPhoto = async (key: string) => {
    try {
      const res = await api.get('/upload/signed-url', { params: { key } });
      const url = res.data?.data?.url;
      if (url) window.open(url, '_blank');
      else message.warning('无法生成预览链接');
    } catch {
      message.error('获取预览链接失败');
    }
  };

  const handleUpload = async () => {
    if (!pendingFile) {
      message.warning('请选择照片');
      return;
    }
    if (!takenAt) {
      message.warning('请填写拍摄时间');
      return;
    }
    if (
      takenAt.isBefore(dayjs(tripStart))
      || takenAt.isAfter(dayjs(tripEnd))
    ) {
      message.warning('拍摄时间需在出差期间内');
      return;
    }
    setUploading(true);
    try {
      // 1) 上传文件到 OSS
      const form = new FormData();
      form.append('file', pendingFile);
      const uploadRes = await api.post(
        `/upload/business-trip/${tripId}/file`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      const uploaded = uploadRes.data.data;

      // 2) 写回 watermark 元数据
      await api.post(`/business-trips/${tripId}/watermark`, {
        object_key: uploaded.object_key,
        name: uploaded.name,
        type: uploaded.type,
        taken_at: takenAt.toISOString(),
        uploaded_at: uploaded.uploaded_at,
      });

      message.success('水印打卡照片已上传');
      setPendingFile(null);
      setTakenAt(null);
      fetchAudit();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const tableData = (audit?.expected || []).map((d) => ({
    date: d,
    count: audit?.actual?.[d] || 0,
    missing: !audit?.actual?.[d],
  }));

  const photoColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      width: 120,
      render: (d: string) => dayjs(d).format('YYYY-MM-DD ddd'),
    },
    {
      title: '已上传张数',
      dataIndex: 'count',
      width: 120,
    },
    {
      title: '状态',
      width: 100,
      render: (_: any, r: { missing: boolean }) => (
        r.missing
          ? <Tag color="red">缺打卡</Tag>
          : <Tag color="green">已打卡</Tag>
      ),
    },
  ];

  return (
    <Card
      size="small"
      title="水印打卡"
      extra={(
        <Space>
          <span style={{ color: '#999' }}>
            共 {audit?.total_photos || 0} 张
          </span>
        </Space>
      )}
      loading={loading}
    >
      {audit && audit.missing.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message={`有 ${audit.missing.length} 天缺水印打卡`}
          description={audit.missing.map((d) => dayjs(d).format('MM-DD')).join('，')}
        />
      )}

      {canUpload && (
        <Space style={{ marginBottom: 12 }} wrap>
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={(file) => {
              setPendingFile(file);
              return false;
            }}
          >
            <Button icon={<UploadOutlined />}>
              {pendingFile ? `已选：${pendingFile.name}` : '选择照片'}
            </Button>
          </Upload>
          <DatePicker
            placeholder="拍摄时间"
            showTime={{ format: 'HH:mm' }}
            format="YYYY-MM-DD HH:mm"
            value={takenAt}
            onChange={setTakenAt}
            disabledDate={(d) => {
              if (!d) return false;
              return (
                d.isBefore(dayjs(tripStart).startOf('day'))
                || d.isAfter(dayjs(tripEnd).endOf('day'))
              );
            }}
          />
          <Button
            type="primary"
            loading={uploading}
            disabled={!pendingFile || !takenAt}
            onClick={handleUpload}
          >
            提交打卡
          </Button>
        </Space>
      )}

      <Table
        rowKey="date"
        size="small"
        dataSource={tableData}
        columns={photoColumns as any}
        pagination={false}
        style={{ marginBottom: 16 }}
        locale={{ emptyText: '暂无应打卡日期' }}
      />

      {audit && audit.photos.length > 0 ? (
        <div>
          <h4 style={{ marginTop: 0 }}>已上传照片</h4>
          <Space wrap>
            {audit.photos.map((p) => (
              <Button
                key={p.object_key}
                size="small"
                icon={<EyeOutlined />}
                onClick={() => previewPhoto(p.object_key)}
              >
                {dayjs(p.taken_at || p.uploaded_at).format('MM-DD HH:mm')} {p.name}
              </Button>
            ))}
          </Space>
        </div>
      ) : (
        <Empty
          description="尚未上传水印照片"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </Card>
  );
};

export default WatermarkPanel;
