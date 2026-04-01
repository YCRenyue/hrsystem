/**
 * My Document Confirmations Page
 * Employee view for their own policy and training documents
 */
import React, { useState, useEffect } from "react";
import {
  Card,
  List,
  Tag,
  Button,
  Spin,
  App,
  Typography,
  Space,
  Result,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  EyeOutlined,
  FileProtectOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { useAuth } from "../../contexts/AuthContext";
import { Employee } from "../../types";
import { employeeService } from "../../services/employeeService";

const { Title, Text } = Typography;

interface DocumentItem {
  key: string;
  title: string;
  type: "policy_ack" | "training_pledge";
  isSigned: boolean;
  signedAt?: string;
}

const MyDocumentConfirmations: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { user } = useAuth();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.employee_id) {
      fetchEmployee(user.employee_id);
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.employee_id]);

  const fetchEmployee = async (employeeId: string) => {
    try {
      const data = await employeeService.getEmployeeById(employeeId);
      setEmployee(data);
    } catch (error: any) {
      message.error(
        error.response?.data?.message || "Failed to load employee info"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user?.employee_id || !employee) {
    return (
      <Result
        status="warning"
        title="No linked employee record"
        subTitle="Your account is not linked to an employee record."
      />
    );
  }

  const documents: DocumentItem[] = [
    {
      key: "policy_ack",
      title: "公司制度阅读确认表",
      type: "policy_ack",
      isSigned: !!employee.policy_ack_status,
      signedAt: employee.policy_ack_signed_at,
    },
    {
      key: "training_pledge",
      title: "员工培训承诺函",
      type: "training_pledge",
      isSigned: !!employee.training_pledge_status,
      signedAt: employee.training_pledge_signed_at,
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <Title level={4}>
        <Space>
          <FileProtectOutlined />
          我的制度确认
        </Space>
      </Title>

      <List
        grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2 }}
        dataSource={documents}
        renderItem={(item) => (
          <List.Item>
            <Card
              hoverable
              onClick={() =>
                navigate(
                  `/document-confirmations/${employee.employee_id}/${item.type}`
                )
              }
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                <Text strong style={{ fontSize: 16 }}>
                  {item.title}
                </Text>
                <div>
                  {item.isSigned ? (
                    <Tag
                      icon={<CheckCircleOutlined />}
                      color="success"
                    >
                      已签署
                    </Tag>
                  ) : (
                    <Tag
                      icon={<ClockCircleOutlined />}
                      color="warning"
                    >
                      待签署
                    </Tag>
                  )}
                </div>
                {item.isSigned && item.signedAt && (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    签署时间：{dayjs(item.signedAt).format("YYYY-MM-DD HH:mm")}
                  </Text>
                )}
                <Button
                  type={item.isSigned ? "default" : "primary"}
                  icon={item.isSigned ? <EyeOutlined /> : <EditOutlined />}
                  block
                >
                  {item.isSigned ? "查看" : "去签署"}
                </Button>
              </Space>
            </Card>
          </List.Item>
        )}
      />
    </div>
  );
};

export default MyDocumentConfirmations;
