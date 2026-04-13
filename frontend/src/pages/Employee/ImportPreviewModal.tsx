/**
 * Import Preview Modal
 * Shows a summary of what will be imported before HR confirms the action.
 */
import React from "react";
import { Modal, Table, Tag, Alert, Space, Statistic, Row, Col } from "antd";
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { ImportPreviewData, ImportSampleRow, ImportErrorItem } from "../../types";

interface ImportPreviewModalProps {
  open: boolean;
  loading: boolean;
  preview: ImportPreviewData | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const sampleColumns: ColumnsType<ImportSampleRow> = [
  { title: "行号", dataIndex: "row", key: "row", width: 60 },
  { title: "工号", dataIndex: "employee_number", key: "employee_number", width: 110 },
  { title: "姓名", dataIndex: "name", key: "name", width: 80 },
  { title: "部门", dataIndex: "department_name", key: "department_name", width: 100 },
  { title: "职位", dataIndex: "position", key: "position", width: 100 },
  { title: "入职日期", dataIndex: "entry_date", key: "entry_date", width: 110 },
];

const errorColumns: ColumnsType<ImportErrorItem> = [
  { title: "行号", dataIndex: "row", key: "row", width: 60 },
  {
    title: "类型",
    dataIndex: "type",
    key: "type",
    width: 90,
    render: (type: string) =>
      type === "parse_error" ? (
        <Tag color="red">格式错误</Tag>
      ) : (
        <Tag color="orange">业务冲突</Tag>
      ),
  },
  { title: "原因", dataIndex: "message", key: "message" },
];

const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  open,
  loading,
  preview,
  onConfirm,
  onCancel,
}) => {
  if (!preview) return null;

  const totalErrors = preview.parse_error_count + preview.business_error_count;
  const allErrors = [...preview.parse_errors, ...preview.business_errors];

  return (
    <Modal
      title="导入预览"
      open={open}
      onOk={onConfirm}
      onCancel={onCancel}
      okText="确认导入"
      cancelText="取消"
      okButtonProps={{ disabled: preview.valid_count === 0, loading }}
      width={760}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Row gutter={24}>
          <Col span={8}>
            <Statistic
              title="总数据行"
              value={preview.total_rows}
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="可导入"
              value={preview.valid_count}
              valueStyle={{ color: "#3f8600" }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="有问题"
              value={totalErrors}
              valueStyle={{ color: totalErrors > 0 ? "#cf1322" : "#3f8600" }}
              prefix={<CloseCircleOutlined />}
            />
          </Col>
        </Row>

        {preview.valid_count > 0 && (
          <>
            <div style={{ fontWeight: 500 }}>
              可导入数据预览（前 {preview.sample_rows.length} 条）
            </div>
            <Table
              dataSource={preview.sample_rows}
              columns={sampleColumns}
              rowKey="row"
              size="small"
              pagination={false}
              scroll={{ x: 560 }}
            />
          </>
        )}

        {totalErrors > 0 && (
          <>
            <Alert
              type="warning"
              message={`以下 ${totalErrors} 行将被跳过，仅导入无问题的行`}
              showIcon
            />
            <Table
              dataSource={allErrors}
              columns={errorColumns}
              rowKey={(r) => `${r.row}-${r.type}`}
              size="small"
              pagination={{ pageSize: 5, hideOnSinglePage: true }}
              scroll={{ x: 400 }}
            />
          </>
        )}

        {preview.valid_count === 0 && (
          <Alert type="error" message="没有可导入的有效数据，请检查文件内容后重新上传" showIcon />
        )}
      </Space>
    </Modal>
  );
};

export default ImportPreviewModal;
