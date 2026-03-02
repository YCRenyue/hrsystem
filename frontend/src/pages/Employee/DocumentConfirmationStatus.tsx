/**
 * Document Confirmation Status section for Employee Detail
 */
import React from "react";
import { Descriptions, Tag, Button, Space } from "antd";
import {
  FileProtectOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { Employee } from "../../types";

interface Props {
  employee: Employee;
  formatDate: (date: string | undefined) => string;
}

const DocumentConfirmationStatus: React.FC<Props> = ({
  employee,
  formatDate,
}) => {
  const navigate = useNavigate();

  return (
    <>
      <div className="section-title">
        <Space>
          <FileProtectOutlined />
          <span>制度确认状态</span>
        </Space>
      </div>
      <Descriptions
        bordered
        column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
        styles={{ label: { fontWeight: 500, width: "150px" } }}
        style={{ marginTop: 16 }}
      >
        <Descriptions.Item label="公司制度阅读确认">
          <Space>
            {employee.policy_ack_status ? (
              <Tag icon={<CheckCircleOutlined />} color="success">
                已签署
              </Tag>
            ) : (
              <Tag icon={<ClockCircleOutlined />} color="warning">
                待签署
              </Tag>
            )}
            {employee.policy_ack_signed_at && (
              <span>{formatDate(employee.policy_ack_signed_at)}</span>
            )}
            <Button
              type="link"
              size="small"
              onClick={() =>
                navigate(
                  `/document-confirmations/${employee.employee_id}/policy_ack`
                )
              }
            >
              {employee.policy_ack_status ? "查看" : "去签署"}
            </Button>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="员工培训承诺函">
          <Space>
            {employee.training_pledge_status ? (
              <Tag icon={<CheckCircleOutlined />} color="success">
                已签署
              </Tag>
            ) : (
              <Tag icon={<ClockCircleOutlined />} color="warning">
                待签署
              </Tag>
            )}
            {employee.training_pledge_signed_at && (
              <span>{formatDate(employee.training_pledge_signed_at)}</span>
            )}
            <Button
              type="link"
              size="small"
              onClick={() =>
                navigate(
                  `/document-confirmations/${employee.employee_id}/training_pledge`
                )
              }
            >
              {employee.training_pledge_status ? "查看" : "去签署"}
            </Button>
          </Space>
        </Descriptions.Item>
      </Descriptions>
    </>
  );
};

export default DocumentConfirmationStatus;
