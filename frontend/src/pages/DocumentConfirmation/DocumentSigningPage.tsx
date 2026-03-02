/**
 * Document Signing Page
 * Allows employees to view and sign policy confirmation or training commitment
 */
import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  Descriptions,
  Button,
  Space,
  Spin,
  App,
  Typography,
  Checkbox,
  Input,
  Tag,
  Result,
  Divider,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import html2canvas from "html2canvas";
import { Employee } from "../../types";
import { employeeService } from "../../services/employeeService";
import { uploadService } from "../../services/uploadService";
import { DOCUMENT_TEMPLATES } from "./documentTemplates";
import type { DocumentTemplate } from "./documentTemplates";

const { Title, Paragraph, Text } = Typography;

type DocumentType = "policy_ack" | "training_pledge";

const DocumentSigningPage: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { employeeId, documentType } = useParams<{
    employeeId: string;
    documentType: string;
  }>();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const documentRef = useRef<HTMLDivElement>(null);

  const docType = documentType as DocumentType;
  const template: DocumentTemplate | undefined =
    DOCUMENT_TEMPLATES[docType];

  const isSigned = docType === "policy_ack"
    ? employee?.policy_ack_status
    : employee?.training_pledge_status;

  const signedAt = docType === "policy_ack"
    ? employee?.policy_ack_signed_at
    : employee?.training_pledge_signed_at;

  useEffect(() => {
    if (!employeeId || !template) return;
    fetchEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const fetchEmployee = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const data = await employeeService.getEmployeeById(employeeId);
      setEmployee(data);
    } catch (error: any) {
      message.error(
        error.response?.data?.message || "Failed to load employee"
      );
      navigate("/employees");
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!employeeId || !employee) return;

    if (!agreed) {
      message.warning("Please confirm you have read and understood the terms");
      return;
    }

    if (!signatureName.trim()) {
      message.warning("Please enter your name as signature");
      return;
    }

    setSigning(true);
    try {
      await employeeService.signDocument(employeeId, docType);

      // Generate document image and upload to OSS
      if (documentRef.current) {
        try {
          const canvas = await html2canvas(documentRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
          });
          const blob: Blob = await new Promise((resolve, reject) => {
            canvas.toBlob(
              (b: Blob | null) => {
                if (b) resolve(b);
                else reject(new Error("Canvas to blob failed"));
              },
              "image/png"
            );
          });
          const file = new File([blob], `${docType}_${employeeId}.png`, {
            type: "image/png",
          });
          await uploadService.uploadEmployeeFile(employeeId, file, docType);
        } catch (uploadErr) {
          console.error("Failed to upload signed document:", uploadErr);
        }
      }

      message.success("Signed successfully");
      await fetchEmployee();
    } catch (error: any) {
      message.error(
        error.response?.data?.message || "Failed to sign document"
      );
    } finally {
      setSigning(false);
    }
  };

  if (!template) {
    return (
      <Result
        status="404"
        title="Document not found"
        subTitle="The requested document type does not exist"
        extra={
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        }
      />
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!employee) return null;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px" }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{ marginBottom: 16 }}
      >
        返回
      </Button>

      <div ref={documentRef}>
        <Card>
          <Title level={3} style={{ textAlign: "center" }}>
            {template.title}
          </Title>

          <Divider />

          <Descriptions
            bordered
            column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
            styles={{ label: { fontWeight: 500, width: "120px" } }}
          >
            <Descriptions.Item label="姓名">
              {employee.name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="部门">
              {employee.department?.name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="职位">
              {employee.position || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="入职日期">
              {employee.entry_date
                ? dayjs(employee.entry_date).format("YYYY-MM-DD")
                : "-"}
            </Descriptions.Item>
          </Descriptions>

          <Divider />

          <Typography>
            <Paragraph>{template.preamble}</Paragraph>

            {template.sections.map((section, idx) => (
              <div key={idx} style={{ marginBottom: 16 }}>
                <Text strong>{section.heading}</Text>
                <Paragraph style={{ marginTop: 4 }}>
                  {section.content}
                </Paragraph>
                {section.subItems && (
                  <ul style={{ paddingLeft: 24 }}>
                    {section.subItems.map((item, i) => (
                      <li key={i}>
                        <Text>{item}</Text>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            <Divider />

            <Paragraph strong>{template.closingStatement}</Paragraph>
          </Typography>

          <Divider />

          {isSigned ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <Tag
                color="green"
                icon={<CheckCircleOutlined />}
                style={{ fontSize: 16, padding: "6px 16px" }}
              >
                已签署
              </Tag>
              <div style={{ marginTop: 12 }}>
                <Text type="secondary">
                  签署时间：{signedAt
                    ? dayjs(signedAt).format("YYYY-MM-DD HH:mm:ss")
                    : "-"}
                </Text>
              </div>
            </div>
          ) : (
            <div
              style={{
                textAlign: "right",
                marginTop: 16,
              }}
            >
              <Descriptions
                column={1}
                bordered={false}
                styles={{ label: { fontWeight: 500 } }}
              >
                <Descriptions.Item label="签署人">
                  {signatureName || "___________"}
                </Descriptions.Item>
                <Descriptions.Item label="日期">
                  {dayjs().format("YYYY-MM-DD")}
                </Descriptions.Item>
              </Descriptions>
            </div>
          )}
        </Card>
      </div>

      {!isSigned && (
        <Card style={{ marginTop: 16 }}>
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)}>
              我已认真阅读并充分理解上述全部内容
            </Checkbox>

            <div>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                签名（请输入您的姓名）：
              </Text>
              <Input
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder="请输入您的姓名作为电子签名"
                style={{ maxWidth: 300 }}
              />
            </div>

            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={handleSign}
              loading={signing}
              disabled={!agreed || !signatureName.trim()}
              size="large"
            >
              确认签署
            </Button>
          </Space>
        </Card>
      )}
    </div>
  );
};

export default DocumentSigningPage;
