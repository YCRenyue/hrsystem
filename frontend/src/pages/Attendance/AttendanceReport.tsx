/**
 * Attendance Report Page
 * 考勤报表：展示每位员工的迟到/早退/请假等汇总
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Row,
  Col,
  Statistic,
  DatePicker,
  Select,
  App,
  Tag,
  Upload,
} from 'antd';
import {
  ReloadOutlined,
  ClockCircleOutlined,
  LogoutOutlined,
  FileExcelOutlined,
  TeamOutlined,
  ImportOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Dayjs } from 'dayjs';
import { attendanceService, AttendanceSummaryRow, AttendanceReport as ReportData } from '../../services/attendanceService';
import apiClient from '../../services/api';
import { usePermission } from '../../hooks/usePermission';

interface ImportResult {
  sheets_processed: number;
  employees_total: number;
  matched: number;
  daily_created: number;
  daily_updated: number;
  summaries_created: number;
  summaries_updated: number;
  periods: string[];
  unmatched: Array<{ sheet: string; name: string; external_id?: string }>;
  ambiguous: Array<{ sheet: string; name: string }>;
}

const { RangePicker } = DatePicker;
const { Option } = Select;

const AttendanceReportPage: React.FC = () => {
  const { dataScope, hasPermission } = usePermission();
  const { message, modal } = App.useApp();

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [departmentId, setDepartmentId] = useState<string | undefined>(undefined);
  const [departments, setDepartments] = useState<Array<{ department_id: string; name: string }>>([]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (range) {
        params.period_start = range[0].format('YYYY-MM-DD');
        params.period_end = range[1].format('YYYY-MM-DD');
      }
      if (departmentId) params.department_id = departmentId;
      const data = await attendanceService.getReport(params);
      setReport(data);
    } catch (e) {
      console.error(e);
      message.error('加载考勤报表失败');
    } finally {
      setLoading(false);
    }
  }, [range, departmentId, message]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    if (dataScope !== 'all') return;
    apiClient.get('/departments').then((resp) => {
      if (resp.data.success) setDepartments(resp.data.data);
    }).catch(() => undefined);
  }, [dataScope]);

  const handleImportCard = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const hideLoading = message.loading('正在解析考勤卡表...', 0);
    try {
      const response = await apiClient.post('/attendances/import-card', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      hideLoading();
      const result: ImportResult = response.data.data;

      modal.success({
        title: '考勤卡表导入完成',
        width: 600,
        content: (
          <div>
            <p>
              处理工作表 <b>{result.sheets_processed}</b> 个，员工 <b>{result.employees_total}</b> 人，匹配成功 <b>{result.matched}</b> 人
            </p>
            <p>
              写入打卡记录：新增 <b>{result.daily_created}</b> / 更新 <b>{result.daily_updated}</b>
            </p>
            <p>
              汇总记录：新增 <b>{result.summaries_created}</b> / 更新 <b>{result.summaries_updated}</b>
            </p>
            {result.periods?.length > 0 && (
              <p>统计周期：{result.periods.join(', ')}</p>
            )}
            {result.unmatched?.length > 0 && (
              <div style={{ maxHeight: 200, overflow: 'auto', marginTop: 8 }}>
                <b style={{ color: '#faad14' }}>未匹配员工（姓名在花名册中不存在）：</b>
                {result.unmatched.map((u, i) => (
                  <p key={i} style={{ margin: '4px 0' }}>
                    [{u.sheet}] {u.name}（考勤表工号: {u.external_id || '-'}）
                  </p>
                ))}
              </div>
            )}
            {result.ambiguous?.length > 0 && (
              <div style={{ maxHeight: 200, overflow: 'auto', marginTop: 8 }}>
                <b style={{ color: '#f5222d' }}>重名员工（需人工核对）：</b>
                {result.ambiguous.map((a, i) => (
                  <p key={i} style={{ margin: '4px 0' }}>[{a.sheet}] {a.name}</p>
                ))}
              </div>
            )}
          </div>
        ),
      });

      fetchReport();
    } catch (error: unknown) {
      hideLoading();
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || '导入失败';
      message.error(msg);
    }
    return false;
  };

  const columns: ColumnsType<AttendanceSummaryRow> = [
    {
      title: '工号',
      dataIndex: ['employee', 'employee_number'],
      key: 'employee_number',
      width: 100,
      render: (v, row) => row.employee?.employee_number || '-',
    },
    {
      title: '姓名',
      dataIndex: ['employee', 'name'],
      key: 'name',
      width: 100,
      render: (v, row) => row.employee?.name || '-',
    },
    {
      title: '部门',
      dataIndex: ['employee', 'department', 'name'],
      key: 'department',
      width: 120,
      render: (v, row) => row.employee?.department?.name || '-',
    },
    {
      title: '统计周期',
      key: 'period',
      width: 200,
      render: (_: unknown, row) => `${row.period_start} ~ ${row.period_end}`,
    },
    {
      title: '上班天数',
      dataIndex: 'work_days',
      key: 'work_days',
      width: 90,
      sorter: (a, b) => Number(a.work_days) - Number(b.work_days),
    },
    {
      title: '请假天数',
      dataIndex: 'leave_days',
      key: 'leave_days',
      width: 90,
      sorter: (a, b) => Number(a.leave_days) - Number(b.leave_days),
      render: (v) => (Number(v) > 0 ? <Tag color="orange">{v}</Tag> : v),
    },
    {
      title: '旷工天数',
      dataIndex: 'absent_days',
      key: 'absent_days',
      width: 90,
      sorter: (a, b) => Number(a.absent_days) - Number(b.absent_days),
      render: (v) => (Number(v) > 0 ? <Tag color="red">{v}</Tag> : v),
    },
    {
      title: '出差天数',
      dataIndex: 'business_trip_days',
      key: 'business_trip_days',
      width: 90,
    },
    {
      title: '迟到次数',
      dataIndex: 'late_count',
      key: 'late_count',
      width: 90,
      sorter: (a, b) => a.late_count - b.late_count,
      render: (v) => (v > 0 ? <Tag color="gold">{v}</Tag> : v),
    },
    {
      title: '迟到分钟',
      dataIndex: 'late_minutes',
      key: 'late_minutes',
      width: 90,
    },
    {
      title: '早退次数',
      dataIndex: 'early_leave_count',
      key: 'early_leave_count',
      width: 90,
      sorter: (a, b) => a.early_leave_count - b.early_leave_count,
      render: (v) => (v > 0 ? <Tag color="volcano">{v}</Tag> : v),
    },
    {
      title: '早退分钟',
      dataIndex: 'early_leave_minutes',
      key: 'early_leave_minutes',
      width: 90,
    },
    {
      title: '加班(正常)',
      dataIndex: 'overtime_normal_hours',
      key: 'overtime_normal_hours',
      width: 100,
      render: (v) => `${Number(v).toFixed(2)}h`,
    },
    {
      title: '加班(假日)',
      dataIndex: 'overtime_holiday_hours',
      key: 'overtime_holiday_hours',
      width: 100,
      render: (v) => `${Number(v).toFixed(2)}h`,
    },
  ];

  const latePeople = (report?.rows || [])
    .filter((r) => r.late_count > 0)
    .sort((a, b) => b.late_count - a.late_count);

  const earlyLeavePeople = (report?.rows || [])
    .filter((r) => r.early_leave_count > 0)
    .sort((a, b) => b.early_leave_count - a.early_leave_count);

  const leavePeople = (report?.rows || [])
    .filter((r) => Number(r.leave_days) > 0)
    .sort((a, b) => Number(b.leave_days) - Number(a.leave_days));

  const canImport = hasPermission('employees.export');

  return (
    <div style={{ padding: 24 }}>
      <h2>考勤报表</h2>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <RangePicker
            value={range}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) setRange([dates[0], dates[1]]);
              else setRange(null);
            }}
            format="YYYY-MM-DD"
            placeholder={['周期开始', '周期结束']}
          />
          {dataScope === 'all' && (
            <Select
              placeholder="部门"
              style={{ width: 180 }}
              allowClear
              value={departmentId}
              onChange={setDepartmentId}
            >
              {departments.map((d) => (
                <Option key={d.department_id} value={d.department_id}>
                  {d.name}
                </Option>
              ))}
            </Select>
          )}
          <Button icon={<ReloadOutlined />} onClick={fetchReport}>
            刷新
          </Button>
          {canImport && (
            <Upload
              accept=".xlsx,.xls"
              showUploadList={false}
              beforeUpload={handleImportCard}
            >
              <Button type="primary" icon={<ImportOutlined />}>
                导入考勤卡表
              </Button>
            </Upload>
          )}
        </Space>
      </Card>

      {report && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="迟到人员"
                value={report.totals.late_people_count}
                suffix={`人 / ${report.totals.total_late_count}次`}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="早退人员"
                value={report.totals.early_leave_people_count}
                suffix={`人 / ${report.totals.total_early_leave_count}次`}
                prefix={<LogoutOutlined />}
                valueStyle={{ color: '#fa541c' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="请假天数"
                value={Number(report.totals.total_leave_days).toFixed(1)}
                suffix="天"
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="加班总时长"
                value={Number(report.totals.total_overtime_hours).toFixed(2)}
                suffix="小时"
                prefix={<FileExcelOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={8}>
          <Card title="迟到人员 TOP">
            <Table
              size="small"
              rowKey="summary_id"
              loading={loading}
              pagination={{ pageSize: 5 }}
              columns={[
                { title: '姓名', render: (_: unknown, r: AttendanceSummaryRow) => r.employee?.name || '-' },
                { title: '次数', dataIndex: 'late_count', width: 80 },
                { title: '分钟', dataIndex: 'late_minutes', width: 80 },
              ]}
              dataSource={latePeople}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="早退人员 TOP">
            <Table
              size="small"
              rowKey="summary_id"
              loading={loading}
              pagination={{ pageSize: 5 }}
              columns={[
                { title: '姓名', render: (_: unknown, r: AttendanceSummaryRow) => r.employee?.name || '-' },
                { title: '次数', dataIndex: 'early_leave_count', width: 80 },
                { title: '分钟', dataIndex: 'early_leave_minutes', width: 80 },
              ]}
              dataSource={earlyLeavePeople}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="请假人员 TOP">
            <Table
              size="small"
              rowKey="summary_id"
              loading={loading}
              pagination={{ pageSize: 5 }}
              columns={[
                { title: '姓名', render: (_: unknown, r: AttendanceSummaryRow) => r.employee?.name || '-' },
                { title: '天数', dataIndex: 'leave_days', width: 80 },
              ]}
              dataSource={leavePeople}
            />
          </Card>
        </Col>
      </Row>

      <Card title="考勤汇总明细">
        <Table<AttendanceSummaryRow>
          columns={columns}
          rowKey="summary_id"
          loading={loading}
          dataSource={report?.rows || []}
          scroll={{ x: 1400 }}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default AttendanceReportPage;
