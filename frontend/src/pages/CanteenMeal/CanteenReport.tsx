/**
 * Canteen Report Page
 * 食堂报表：每日/每周中餐晚餐人次、每人用餐情况，支持导入食堂卡表
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
  Upload,
  Modal,
  Tabs,
} from 'antd';
import {
  ReloadOutlined,
  ImportOutlined,
  CoffeeOutlined,
  FireOutlined,
  TeamOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { Column as ColumnChart, Line as LineChart } from '@ant-design/charts';
import type { ColumnsType } from 'antd/es/table';
import { Dayjs } from 'dayjs';
import {
  canteenService,
  CanteenReport as ReportData,
  CanteenPerEmployee,
  CanteenEmployeeDetail,
} from '../../services/canteenService';
import apiClient from '../../services/api';
import { usePermission } from '../../hooks/usePermission';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface ImportResult {
  sheets_processed: number;
  employees_total: number;
  matched: number;
  meals_created: number;
  meals_updated: number;
  periods: string[];
  unmatched: Array<{ sheet: string; name: string; external_id?: string }>;
  ambiguous: Array<{ sheet: string; name: string }>;
}

const CanteenReportPage: React.FC = () => {
  const { dataScope, hasPermission } = usePermission();
  const { message, modal } = App.useApp();

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [departmentId, setDepartmentId] = useState<string | undefined>(undefined);
  const [departments, setDepartments] = useState<Array<{ department_id: string; name: string }>>([]);

  const [detailEmployee, setDetailEmployee] = useState<CanteenPerEmployee | null>(null);
  const [detailData, setDetailData] = useState<CanteenEmployeeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (range) {
        params.start_date = range[0].format('YYYY-MM-DD');
        params.end_date = range[1].format('YYYY-MM-DD');
      }
      if (departmentId) params.department_id = departmentId;
      const data = await canteenService.getReport(params);
      setReport(data);
    } catch (e) {
      console.error(e);
      message.error('加载食堂报表失败');
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

  const openEmployeeDetail = async (employee: CanteenPerEmployee) => {
    setDetailEmployee(employee);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const params: Record<string, string> = {};
      if (range) {
        params.start_date = range[0].format('YYYY-MM-DD');
        params.end_date = range[1].format('YYYY-MM-DD');
      }
      const data = await canteenService.getEmployeeDetail(employee.employee_id, params);
      setDetailData(data);
    } catch (e) {
      console.error(e);
      message.error('加载用餐明细失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleImportCard = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const hideLoading = message.loading('正在解析食堂卡表...', 0);
    try {
      const response = await apiClient.post('/canteen-meals/import-card', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      hideLoading();
      const result: ImportResult = response.data.data;

      modal.success({
        title: '食堂卡表导入完成',
        width: 600,
        content: (
          <div>
            <p>
              处理工作表 <b>{result.sheets_processed}</b> 个，员工 <b>{result.employees_total}</b> 人，匹配成功 <b>{result.matched}</b> 人
            </p>
            <p>
              写入就餐记录：新增 <b>{result.meals_created}</b> / 更新 <b>{result.meals_updated}</b>
            </p>
            {result.periods?.length > 0 && (
              <p>统计周期：{result.periods.join(', ')}</p>
            )}
            {result.unmatched?.length > 0 && (
              <div style={{ maxHeight: 200, overflow: 'auto', marginTop: 8 }}>
                <b style={{ color: '#faad14' }}>未匹配员工（姓名在花名册中不存在）：</b>
                {result.unmatched.map((u, i) => (
                  <p key={i} style={{ margin: '4px 0' }}>
                    [{u.sheet}] {u.name}（卡表工号: {u.external_id || '-'}）
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

  // Chart data
  const dailyChartData = (report?.daily || []).flatMap((d) => [
    { date: d.date, type: '午餐', value: d.lunch },
    { date: d.date, type: '晚餐', value: d.dinner },
  ]);
  const weeklyChartData = (report?.weekly || []).flatMap((w) => [
    { week: `${w.week_start}~${w.week_end}`, type: '午餐', value: w.lunch },
    { week: `${w.week_start}~${w.week_end}`, type: '晚餐', value: w.dinner },
  ]);

  // Per-employee table columns
  const perEmpColumns: ColumnsType<CanteenPerEmployee> = [
    { title: '工号', dataIndex: 'employee_number', key: 'employee_number', width: 100 },
    { title: '姓名', dataIndex: 'name', key: 'name', width: 120, render: (v) => v || '-' },
    { title: '部门', dataIndex: 'department_name', key: 'department_name', width: 150, render: (v) => v || '-' },
    {
      title: '中餐次数', dataIndex: 'lunch', key: 'lunch', width: 100,
      sorter: (a, b) => a.lunch - b.lunch,
    },
    {
      title: '晚餐次数', dataIndex: 'dinner', key: 'dinner', width: 100,
      sorter: (a, b) => a.dinner - b.dinner,
    },
    {
      title: '总餐次', dataIndex: 'total', key: 'total', width: 100,
      sorter: (a, b) => a.total - b.total,
      defaultSortOrder: 'descend',
    },
    {
      title: '操作', key: 'actions', width: 100,
      render: (_: unknown, row: CanteenPerEmployee) => (
        <Button type="link" size="small" onClick={() => openEmployeeDetail(row)}>
          查看明细
        </Button>
      ),
    },
  ];

  const dailyColumns: ColumnsType<ReportData['daily'][number]> = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 140 },
    { title: '中餐人数', dataIndex: 'lunch', key: 'lunch', width: 120 },
    { title: '晚餐人数', dataIndex: 'dinner', key: 'dinner', width: 120 },
    {
      title: '合计',
      key: 'total',
      width: 120,
      render: (_: unknown, r) => r.lunch + r.dinner,
    },
  ];

  const weeklyColumns: ColumnsType<ReportData['weekly'][number]> = [
    {
      title: '周',
      key: 'week',
      width: 220,
      render: (_: unknown, r) => `${r.week_start} ~ ${r.week_end}`,
    },
    { title: '中餐人次', dataIndex: 'lunch', key: 'lunch', width: 120 },
    { title: '晚餐人次', dataIndex: 'dinner', key: 'dinner', width: 120 },
    {
      title: '合计',
      key: 'total',
      width: 120,
      render: (_: unknown, r) => r.lunch + r.dinner,
    },
  ];

  const detailColumns: ColumnsType<CanteenEmployeeDetail['rows'][number]> = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 140 },
    {
      title: '中餐',
      dataIndex: 'lunch_time',
      key: 'lunch_time',
      width: 140,
      render: (v: string | null) => (v ? <span style={{ color: '#52c41a' }}>{v}</span> : '-'),
    },
    {
      title: '晚餐',
      dataIndex: 'dinner_time',
      key: 'dinner_time',
      width: 140,
      render: (v: string | null) => (v ? <span style={{ color: '#1890ff' }}>{v}</span> : '-'),
    },
  ];

  const canImport = hasPermission('employees.export');

  return (
    <div style={{ padding: 24 }}>
      <h2>食堂报表</h2>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <RangePicker
            value={range}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) setRange([dates[0], dates[1]]);
              else setRange(null);
            }}
            format="YYYY-MM-DD"
            placeholder={['开始日期', '结束日期']}
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
                导入食堂卡表
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
                title="中餐总人次"
                value={report.totals.total_lunch}
                prefix={<CoffeeOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="晚餐总人次"
                value={report.totals.total_dinner}
                prefix={<FireOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="就餐员工数"
                value={report.totals.unique_employees}
                suffix="人"
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="覆盖天数"
                value={report.totals.days_covered}
                suffix="天"
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="每日中餐/晚餐人数">
            {dailyChartData.length > 0 ? (
              <LineChart
                data={dailyChartData}
                xField="date"
                yField="value"
                colorField="type"
                point={{ shapeField: 'circle', sizeField: 3 }}
                legend={{ position: 'top-right' as const }}
                height={300}
              />
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                暂无数据
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="每周中餐/晚餐人次">
            {weeklyChartData.length > 0 ? (
              <ColumnChart
                data={weeklyChartData}
                xField="week"
                yField="value"
                colorField="type"
                transform={[{ type: 'dodgeX' }]}
                scale={{ x: { type: 'band', padding: 0.2 } }}
                legend={{ position: 'top-right' as const }}
                height={300}
              />
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                暂无数据
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs
          defaultActiveKey="daily"
          items={[
            {
              key: 'daily',
              label: '每日汇总',
              children: (
                <Table
                  columns={dailyColumns}
                  rowKey="date"
                  dataSource={report?.daily || []}
                  loading={loading}
                  pagination={{ pageSize: 20 }}
                  size="middle"
                />
              ),
            },
            {
              key: 'weekly',
              label: '每周汇总',
              children: (
                <Table
                  columns={weeklyColumns}
                  rowKey="week_start"
                  dataSource={report?.weekly || []}
                  loading={loading}
                  pagination={{ pageSize: 20 }}
                  size="middle"
                />
              ),
            },
            {
              key: 'per_employee',
              label: '每人汇总',
              children: (
                <Table<CanteenPerEmployee>
                  columns={perEmpColumns}
                  rowKey="employee_id"
                  dataSource={report?.per_employee || []}
                  loading={loading}
                  pagination={{ pageSize: 20, showSizeChanger: true }}
                  size="middle"
                />
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={!!detailEmployee}
        onCancel={() => {
          setDetailEmployee(null);
          setDetailData(null);
        }}
        footer={null}
        width={640}
        title={
          detailEmployee
            ? `${detailEmployee.name || '-'}（${detailEmployee.employee_number || '-'}）用餐明细`
            : '用餐明细'
        }
      >
        {detailData && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Statistic title="中餐" value={detailData.totals.lunch_count} suffix="次" />
              </Col>
              <Col span={8}>
                <Statistic title="晚餐" value={detailData.totals.dinner_count} suffix="次" />
              </Col>
              <Col span={8}>
                <Statistic title="覆盖天数" value={detailData.totals.days_covered} suffix="天" />
              </Col>
            </Row>
            <Table
              columns={detailColumns}
              rowKey="date"
              dataSource={detailData.rows}
              loading={detailLoading}
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default CanteenReportPage;
