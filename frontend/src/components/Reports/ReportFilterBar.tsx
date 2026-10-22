/**
 * ReportFilterBar - 综合报表通用筛选栏
 *
 * 字段按栅格排列，标签在上方；查询、重置、导出按钮靠右，放不下时整组换行，不会重叠。
 */
import React from 'react';
import {
  Button, Card, Col, Form, FormInstance, Input, Row, Space,
} from 'antd';
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';

interface FieldProps {
  name: string;
  label: string;
  /** 较宽的字段（如日期范围）占两格 */
  wide?: boolean;
  /** 宽屏下的栅格数，默认普通字段 4、较宽字段 8 */
  xl?: number;
  children: React.ReactNode;
}

/** 单个筛选字段 */
export const FilterField: React.FC<FieldProps> = ({
  name, label, wide, xl, children,
}) => (
  <Col xs={24} sm={wide ? 24 : 12} md={wide ? 12 : 6} xl={xl ?? (wide ? 8 : 4)}>
    <Form.Item name={name} label={label} style={{ marginBottom: 12 }}>
      {children}
    </Form.Item>
  </Col>
);

/** 工号、姓名两个独立输入框 */
export const EmployeeFilterFields: React.FC = () => (
  <>
    <FilterField name="employee_number" label="工号">
      <Input placeholder="输入工号" allowClear />
    </FilterField>
    <FilterField name="name" label="姓名">
      <Input placeholder="输入姓名" allowClear />
    </FilterField>
  </>
);

interface BarProps {
  form: FormInstance;
  onSearch: (values: any) => void;
  onReset: () => void;
  onExport?: () => void;
  exportDisabled?: boolean;
  children: React.ReactNode;
}

const ReportFilterBar: React.FC<BarProps> = ({
  form, onSearch, onReset, onExport, exportDisabled, children,
}) => (
  <Card size="small" style={{ marginBottom: 16 }} styles={{ body: { padding: '16px 16px 4px' } }}>
    <Form form={form} layout="vertical" onFinish={onSearch}>
      <Row gutter={16} align="bottom">
        {children}
        <Col flex="none" style={{ marginLeft: 'auto' }}>
          <Form.Item style={{ marginBottom: 12 }}>
            <Space wrap>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                查询
              </Button>
              <Button icon={<ReloadOutlined />} onClick={onReset}>
                重置
              </Button>
              {onExport && (
                <Button icon={<DownloadOutlined />} onClick={onExport} disabled={exportDisabled}>
                  导出
                </Button>
              )}
            </Space>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  </Card>
);

export default ReportFilterBar;
