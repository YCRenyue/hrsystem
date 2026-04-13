/**
 * Document Signing Page
 * Supports variable-interpolated training pledge and paginated policy reading.
 */
import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Progress,
  Alert,
  Form,
  Col,
  Row,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  EditOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import html2canvas from "html2canvas";
import { Employee } from "../../types";
import { employeeService } from "../../services/employeeService";
import { uploadService } from "../../services/uploadService";
import {
  DOCUMENT_TEMPLATES,
  renderTemplate,
  numberToChinese,
} from "./documentTemplates";
import type { DocumentTemplate, DocumentSection } from "./documentTemplates";

const { Title, Paragraph, Text } = Typography;

type DocumentType = "policy_ack" | "training_pledge";

// ---------------------------------------------------------------------------
// Party info type for training pledge editable fields
// ---------------------------------------------------------------------------
interface PartyInfo {
  party_a_name: string;
  party_a_address: string;
  employee_name: string;
  employee_gender: string;
  employee_id_card: string;
  employee_household_address: string;
  employee_current_address: string;
  contract_sign_date: string;
  contract_start_date: string;
  contract_end_date: string;
}

function buildDefaultPartyInfo(emp: Employee): PartyInfo {
  return {
    party_a_name: "盐城仁越生物科技有限公司",
    party_a_address: "江苏建湖县民营科技创业园四号路51号",
    employee_name: emp.name || "",
    employee_gender: (() => {
      const g = (emp as any).gender;
      if (g === "male") return "男";
      if (g === "female") return "女";
      return g || "";
    })(),
    employee_id_card: (emp as any).id_card || "",
    employee_household_address: (emp as any).household_address || "",
    employee_current_address: (emp as any).current_address || "",
    contract_sign_date: (emp as any).entry_date
      ? dayjs((emp as any).entry_date).format("YYYY年MM月DD日")
      : "",
    contract_start_date: (emp as any).contract_start_date
      ? dayjs((emp as any).contract_start_date).format("YYYY年MM月DD日")
      : "",
    contract_end_date: (emp as any).contract_end_date
      ? dayjs((emp as any).contract_end_date).format("YYYY年MM月DD日")
      : "",
  };
}

// ---------------------------------------------------------------------------
// Helper: build variable map from employee + trainingPledge data + partyInfo
// ---------------------------------------------------------------------------
function buildVars(emp: Employee, partyInfo?: PartyInfo): Record<string, string> {
  const pledge = (emp as any).trainingPledge;
  const cost = pledge ? Number(pledge.training_cost) : 0;
  const years = pledge ? Number(pledge.service_years) : 0;

  const serviceStart = years > 0
    ? dayjs("2026-03-20").add(1, "day").format("YYYY年MM月DD日")
    : "[待填写]";
  const serviceEnd = years > 0
    ? dayjs("2026-03-20").add(1, "day").add(years, "year").format("YYYY年MM月DD日")
    : "[待填写]";

  const info = partyInfo ?? buildDefaultPartyInfo(emp);

  return {
    party_a_name: info.party_a_name,
    party_a_address: info.party_a_address,
    employee_name: info.employee_name,
    employee_gender: info.employee_gender,
    employee_id_card: info.employee_id_card,
    employee_household_address: info.employee_household_address,
    employee_current_address: info.employee_current_address,
    contract_sign_date: info.contract_sign_date,
    contract_start_date: info.contract_start_date,
    contract_end_date: info.contract_end_date,
    training_cost: cost > 0 ? String(cost) : "[待填写]",
    training_cost_text: cost > 0 ? numberToChinese(cost) : "[待填写]",
    service_years: years > 0 ? String(years) : "[待填写]",
    service_start_date: serviceStart,
    service_end_date: serviceEnd,
  };
}

// ---------------------------------------------------------------------------
// Render a single section
// ---------------------------------------------------------------------------
function SectionBlock({ section }: { section: DocumentSection }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Text strong>{section.heading}</Text>
      <Paragraph style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>
        {section.content}
      </Paragraph>
      {section.subItems && (
        <ul style={{ paddingLeft: 24 }}>
          {section.subItems.map((item, i) => (
            <li key={i}><Text>{item}</Text></li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
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
  const [currentPage, setCurrentPage] = useState(0);
  const [maxPageReached, setMaxPageReached] = useState(0);
  const [partyInfo, setPartyInfo] = useState<PartyInfo | null>(null);
  const documentRef = useRef<HTMLDivElement>(null);

  const docType = documentType as DocumentType;
  const baseTemplate: DocumentTemplate | undefined = DOCUMENT_TEMPLATES[docType];

  const isSigned = docType === "policy_ack"
    ? employee?.policy_ack_status
    : employee?.training_pledge_status;

  const signedAt = docType === "policy_ack"
    ? employee?.policy_ack_signed_at
    : employee?.training_pledge_signed_at;

  // Rendered template with variables substituted
  const renderedTemplate = useMemo(() => {
    if (!baseTemplate || !employee) return baseTemplate;
    return renderTemplate(baseTemplate, buildVars(employee, partyInfo ?? undefined));
  }, [baseTemplate, employee, partyInfo]);

  // Pagination derived values
  const isPaginated = !!baseTemplate?.paginated;
  const totalPages = isPaginated ? (renderedTemplate?.pages?.length ?? 1) : 1;
  const isLastPage = !isPaginated || currentPage === totalPages - 1;

  // Current page sections (paginated) or all sections
  const currentSections = isPaginated && renderedTemplate?.pages
    ? renderedTemplate.pages[currentPage].sections
    : renderedTemplate?.sections ?? [];

  const currentPageTitle = isPaginated && renderedTemplate?.pages
    ? renderedTemplate.pages[currentPage].pageTitle
    : null;

  // Training pledge guard
  const hasPledgeData = !!(employee && (employee as any).trainingPledge);
  const pledgeMissing = docType === "training_pledge" && !isSigned && !hasPledgeData;

  useEffect(() => {
    if (!employeeId || !baseTemplate) return;
    fetchEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const fetchEmployee = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const data = await employeeService.getEmployeeById(employeeId);
      setEmployee(data);
      if (docType === "training_pledge") {
        setPartyInfo(buildDefaultPartyInfo(data));
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || "Failed to load employee");
      navigate("/employees");
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    setMaxPageReached((prev) => Math.max(prev, page));
  };

  const handleSign = async () => {
    if (!employeeId || !employee) return;
    if (!agreed) { message.warning("请勾选已阅读确认"); return; }
    if (!signatureName.trim()) { message.warning("请输入姓名作为电子签名"); return; }
    const expectedName = (docType === "training_pledge" && partyInfo)
      ? partyInfo.employee_name
      : employee.name;
    if (signatureName.trim() !== expectedName) {
      message.warning("签名姓名与乙方姓名不一致");
      return;
    }

    setSigning(true);
    try {
      // Capture document snapshot before API call so DOM reflects current partyInfo state
      let signedFile: File | null = null;
      if (documentRef.current) {
        try {
          // Wait for React to flush pending DOM updates
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          const canvas = await html2canvas(documentRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
          });
          const blob: Blob = await new Promise((resolve, reject) => {
            canvas.toBlob(
              (b: Blob | null) => { if (b) resolve(b); else reject(new Error("blob failed")); },
              "image/png"
            );
          });
          signedFile = new File([blob], `${docType}_${employeeId}.png`, { type: "image/png" });
        } catch (captureErr) {
          console.error("Failed to capture document:", captureErr);
        }
      }

      await employeeService.signDocument(employeeId, docType);

      if (signedFile) {
        try {
          await uploadService.uploadEmployeeFile(employeeId, signedFile, docType);
        } catch (uploadErr) {
          console.error("Failed to upload signed document:", uploadErr);
        }
      }

      message.success("签署成功");
      await fetchEmployee();
    } catch (error: any) {
      message.error(error.response?.data?.message || "签署失败");
    } finally {
      setSigning(false);
    }
  };

  if (!baseTemplate) {
    return (
      <Result
        status="404"
        title="文档不存在"
        subTitle="请求的文档类型不存在"
        extra={<Button onClick={() => navigate(-1)}>返回</Button>}
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

  if (!employee || !renderedTemplate) return null;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px" }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{ marginBottom: 16 }}
      >
        返回
      </Button>

      {pledgeMissing && (
        <Alert
          type="warning"
          showIcon
          message="HR 尚未配置该员工的培训服务承诺函信息"
          description="请联系HR管理员填写培训总费用和服务年限后再进行签署。"
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Document card - captured by html2canvas on sign */}
      <div ref={documentRef}>
        <Card>
          <Title level={3} style={{ textAlign: "center" }}>
            {renderedTemplate.title}
          </Title>

          {currentPageTitle && (
            <Title level={5} style={{ textAlign: "center", color: "#666" }}>
              {currentPageTitle}
            </Title>
          )}

          <Divider />

          {/* Employee info - only show for non-paginated or first page */}
          {(!isPaginated || currentPage === 0) && !isPaginated && (
            <>
              <Descriptions
                bordered
                column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
                styles={{ label: { fontWeight: 500, width: "120px" } }}
              >
                <Descriptions.Item label="员工编号">
                  {employee.employee_number || "-"}
                </Descriptions.Item>
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
            </>
          )}

          <Typography>
            {currentPage === 0 && (
              <Paragraph>{renderedTemplate.preamble}</Paragraph>
            )}

            {currentSections.map((section, idx) => (
              <SectionBlock key={idx} section={section} />
            ))}

            {isLastPage && (
              <>
                <Divider />
                <Paragraph strong>{renderedTemplate.closingStatement}</Paragraph>
              </>
            )}
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
          ) : isLastPage && !pledgeMissing ? (
            <div style={{ textAlign: "right", marginTop: 16 }}>
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
          ) : null}
        </Card>
      </div>

      {/* Pagination controls */}
      {isPaginated && !isSigned && (
        <Card style={{ marginTop: 16 }}>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Progress
              percent={Math.round(((maxPageReached + 1) / totalPages) * 100)}
              format={() => `已读 ${maxPageReached + 1} / ${totalPages} 页`}
            />
            <Space style={{ justifyContent: "center", width: "100%", display: "flex" }}>
              <Button
                icon={<LeftOutlined />}
                disabled={currentPage === 0}
                onClick={() => goToPage(currentPage - 1)}
              >
                上一页
              </Button>
              <Text type="secondary">
                第 {currentPage + 1} 页 / 共 {totalPages} 页
              </Text>
              <Button
                icon={<RightOutlined />}
                disabled={currentPage === totalPages - 1}
                onClick={() => goToPage(currentPage + 1)}
              >
                下一页
              </Button>
            </Space>
          </Space>
        </Card>
      )}

      {/* Party info editing panel - only for training_pledge, not yet signed */}
      {docType === "training_pledge" && !isSigned && partyInfo && (
        <Card
          title="填写甲乙方信息"
          style={{ marginTop: 16 }}
          styles={{ header: { fontWeight: 600 } }}
        >
          <Form layout="vertical" size="small">
            <Divider orientation="left" orientationMargin={0}>甲方信息</Divider>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item label="名称">
                  <Input
                    value={partyInfo.party_a_name}
                    onChange={(e) =>
                      setPartyInfo({ ...partyInfo, party_a_name: e.target.value })
                    }
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="住所地">
                  <Input
                    value={partyInfo.party_a_address}
                    onChange={(e) =>
                      setPartyInfo({ ...partyInfo, party_a_address: e.target.value })
                    }
                  />
                </Form.Item>
              </Col>
            </Row>
            <Divider orientation="left" orientationMargin={0}>乙方信息</Divider>
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item label="姓名">
                  <Input
                    value={partyInfo.employee_name}
                    onChange={(e) =>
                      setPartyInfo({ ...partyInfo, employee_name: e.target.value })
                    }
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label="性别">
                  <Input
                    value={partyInfo.employee_gender}
                    onChange={(e) =>
                      setPartyInfo({ ...partyInfo, employee_gender: e.target.value })
                    }
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label="身份证号">
                  <Input
                    value={partyInfo.employee_id_card}
                    onChange={(e) =>
                      setPartyInfo({ ...partyInfo, employee_id_card: e.target.value })
                    }
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="户籍地址">
                  <Input
                    value={partyInfo.employee_household_address}
                    onChange={(e) =>
                      setPartyInfo({
                        ...partyInfo,
                        employee_household_address: e.target.value,
                      })
                    }
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="现住址">
                  <Input
                    value={partyInfo.employee_current_address}
                    onChange={(e) =>
                      setPartyInfo({
                        ...partyInfo,
                        employee_current_address: e.target.value,
                      })
                    }
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label="劳动合同签订日期">
                  <Input
                    value={partyInfo.contract_sign_date}
                    onChange={(e) =>
                      setPartyInfo({ ...partyInfo, contract_sign_date: e.target.value })
                    }
                    placeholder="例：2026年01月01日"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label="合同开始日期">
                  <Input
                    value={partyInfo.contract_start_date}
                    onChange={(e) =>
                      setPartyInfo({
                        ...partyInfo,
                        contract_start_date: e.target.value,
                      })
                    }
                    placeholder="例：2026年01月01日"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label="合同结束日期">
                  <Input
                    value={partyInfo.contract_end_date}
                    onChange={(e) =>
                      setPartyInfo({ ...partyInfo, contract_end_date: e.target.value })
                    }
                    placeholder="例：2029年01月01日"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>
      )}

      {/* Signature panel - only on last page when not signed */}
      {!isSigned && isLastPage && !pledgeMissing && (
        <Card style={{ marginTop: 16 }}>
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            {isPaginated && maxPageReached < totalPages - 1 && (
              <Alert
                type="info"
                message="请先阅读完所有页面后再进行签署"
                showIcon
              />
            )}
            <Checkbox
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={isPaginated && maxPageReached < totalPages - 1}
            >
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
                disabled={isPaginated && maxPageReached < totalPages - 1}
              />
            </div>

            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={handleSign}
              loading={signing}
              disabled={
                !agreed ||
                signatureName.trim() !== (
                  docType === "training_pledge" && partyInfo
                    ? partyInfo.employee_name
                    : employee?.name
                ) ||
                (isPaginated && maxPageReached < totalPages - 1)
              }
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
