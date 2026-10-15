/**
 * Document Signing Page
 * Supports variable-interpolated training pledge / employment contract and
 * paginated policy reading.
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
  DatePicker,
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
import {
  DOCUMENT_TEMPLATES,
  renderTemplate,
} from "./documentTemplates";
import type { DocumentTemplate, DocumentSection } from "./documentTemplates";
import {
  DocumentType,
  PartyInfo,
  ContractTerms,
  DOCUMENT_LABELS,
  buildDefaultPartyInfo,
  buildVars,
  renderDisplayValue,
  isDocumentSigned,
  getDocumentSignedAt,
  getHrRecord,
} from "./partyInfoHelpers";

const { Title, Paragraph, Text } = Typography;

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
  const [password, setPassword] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [maxPageReached, setMaxPageReached] = useState(0);
  const [partyInfo, setPartyInfo] = useState<PartyInfo | null>(null);
  const documentRef = useRef<HTMLDivElement>(null);

  const docType = documentType as DocumentType;
  const baseTemplate: DocumentTemplate | undefined = DOCUMENT_TEMPLATES[docType];
  const hasPartyInfoPanel = docType === "training_pledge" || docType === "employment_contract";

  const isSigned = employee ? isDocumentSigned(employee, docType) : false;
  const signedAt = employee ? getDocumentSignedAt(employee, docType) : undefined;
  const hrRecord = employee ? getHrRecord(employee, docType) : undefined;
  const contractTerms: ContractTerms | undefined = docType === "employment_contract" ? hrRecord : undefined;

  // Rendered template with variables substituted
  const renderedTemplate = useMemo(() => {
    if (!baseTemplate || !employee) return baseTemplate;
    return renderTemplate(baseTemplate, buildVars(employee, docType, partyInfo ?? undefined));
  }, [baseTemplate, employee, docType, partyInfo]);

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

  // HR must configure training pledge cost/years or contract terms before the
  // employee can see and sign the document.
  const hrDataMissing = hasPartyInfoPanel && !isSigned && !hrRecord;

  useEffect(() => {
    if (!employeeId || !baseTemplate) return;
    fetchEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const fetchEmployee = async (preservePartyInfo = false) => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const data = await employeeService.getEmployeeById(employeeId);
      setEmployee(data);
      if (hasPartyInfoPanel && !preservePartyInfo) {
        const source = getHrRecord(data, docType);
        // Party A / contract-term info is HR-configured on the pledge/contract
        // record; employee-fillable fields come from the saved snapshot
        // (after signing) or sensible defaults.
        if (isDocumentSigned(data, docType)) {
          setPartyInfo({
            party_a_name: source?.party_a_name || "",
            party_a_address: source?.party_a_address || "",
            employee_name: data.name || "",
            employee_gender: source?.employee_gender || "",
            employee_id_card: source?.employee_id_card || "",
            employee_household_address: source?.employee_household_address || "",
            employee_current_address: source?.employee_current_address || "",
            contract_sign_date: docType === "training_pledge" ? (source?.contract_sign_date || "") : "",
            contract_start_date: docType === "training_pledge" ? (source?.contract_start_date || "") : "",
            contract_end_date: docType === "training_pledge" ? (source?.contract_end_date || "") : "",
          });
        } else {
          const defaults = buildDefaultPartyInfo(data, docType);
          setPartyInfo({
            ...defaults,
            party_a_name: source?.party_a_name || "",
            party_a_address: source?.party_a_address || "",
          });
        }
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

  const expectedSignatureName = hasPartyInfoPanel && partyInfo
    ? partyInfo.employee_name
    : employee?.name;

  const handleSign = async () => {
    if (!employeeId || !employee) return;
    if (!agreed) { message.warning("请勾选已阅读确认"); return; }
    if (!signatureName.trim()) { message.warning("请输入姓名作为电子签名"); return; }
    if (signatureName.trim() !== expectedSignatureName) {
      message.warning("签名姓名与乙方姓名不一致");
      return;
    }
    if (!password) { message.warning("请输入登录密码以完成签署验证"); return; }

    setSigning(true);
    try {
      // Capture document snapshot before the API call so the image reflects
      // the current partyInfo state.
      if (!documentRef.current) {
        message.error("无法生成签署截图，请刷新后重试");
        return;
      }
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
      const signedFile = new File([blob], `${docType}_${employeeId}.png`, { type: "image/png" });

      // Single atomic request: backend uploads the screenshot to OSS and only
      // flips the signed status if that upload succeeds (see
      // employeeController.signDocument). On failure nothing is written, so
      // retrying is simply submitting the sign action again.
      await employeeService.signDocument(
        employeeId,
        docType,
        signedFile,
        password,
        hasPartyInfoPanel && partyInfo ? { ...partyInfo } : undefined
      );

      message.success("签署成功");
      setPassword("");
      // Preserve partyInfo so the signed view shows the exact values used during signing
      await fetchEmployee(true);
    } catch (error: any) {
      message.error(error.response?.data?.message || "签署失败，请重试");
      setPassword("");
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

      {hrDataMissing && (
        <Alert
          type="warning"
          showIcon
          message={`HR 尚未配置该员工的${DOCUMENT_LABELS[docType]}信息`}
          description="请联系HR管理员完成配置后再进行签署。"
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

          {hasPartyInfoPanel && partyInfo && (
            <>
              <Descriptions
                bordered
                column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
                styles={{ label: { fontWeight: 500, width: "140px" } }}
              >
                <Descriptions.Item label="甲方名称">
                  {renderDisplayValue(partyInfo.party_a_name)}
                </Descriptions.Item>
                <Descriptions.Item label="甲方住所地">
                  {renderDisplayValue(partyInfo.party_a_address)}
                </Descriptions.Item>
                <Descriptions.Item label="乙方姓名">
                  {renderDisplayValue(partyInfo.employee_name)}
                </Descriptions.Item>
                <Descriptions.Item label="性别">
                  {renderDisplayValue(partyInfo.employee_gender)}
                </Descriptions.Item>
                <Descriptions.Item label="身份证号">
                  {renderDisplayValue(partyInfo.employee_id_card)}
                </Descriptions.Item>
                <Descriptions.Item label="户籍地址">
                  {renderDisplayValue(partyInfo.employee_household_address)}
                </Descriptions.Item>
                <Descriptions.Item label="现住址">
                  {renderDisplayValue(partyInfo.employee_current_address)}
                </Descriptions.Item>
                {docType === "training_pledge" && (
                  <>
                    <Descriptions.Item label="劳动合同签订日期">
                      {renderDisplayValue(partyInfo.contract_sign_date)}
                    </Descriptions.Item>
                    <Descriptions.Item label="合同开始日期">
                      {renderDisplayValue(partyInfo.contract_start_date)}
                    </Descriptions.Item>
                    <Descriptions.Item label="合同结束日期">
                      {renderDisplayValue(partyInfo.contract_end_date)}
                    </Descriptions.Item>
                  </>
                )}
                {docType === "employment_contract" && contractTerms && (
                  <>
                    <Descriptions.Item label="合同类型">
                      {renderDisplayValue(contractTerms.contract_type)}
                    </Descriptions.Item>
                    <Descriptions.Item label="岗位">
                      {renderDisplayValue(contractTerms.position)}
                    </Descriptions.Item>
                    <Descriptions.Item label="工作地点">
                      {renderDisplayValue(contractTerms.work_location)}
                    </Descriptions.Item>
                    <Descriptions.Item label="合同期限">
                      {renderDisplayValue(contractTerms.contract_start_date)} 至{" "}
                      {renderDisplayValue(contractTerms.contract_end_date)}
                    </Descriptions.Item>
                    <Descriptions.Item label="月工资">
                      {contractTerms.monthly_salary ? `${contractTerms.monthly_salary} 元` : "___________"}
                    </Descriptions.Item>
                  </>
                )}
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
          ) : isLastPage && !hrDataMissing ? (
            <div style={{ textAlign: "right", marginTop: 16 }}>
              <Descriptions
                column={1}
                bordered={false}
                styles={{ label: { fontWeight: 500 } }}
              >
                <Descriptions.Item label="签署人">
                  {renderDisplayValue(signatureName)}
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

      {/* Party info editing panel - training_pledge / employment_contract, not yet signed */}
      {hasPartyInfoPanel && !isSigned && partyInfo && (
        <Card
          title="填写甲乙方信息"
          style={{ marginTop: 16 }}
          styles={{ header: { fontWeight: 600 } }}
        >
          <Form layout="vertical" size="small">
            <Divider orientation="left" orientationMargin={0}>
              甲方信息（由HR配置，不可修改）
            </Divider>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item label="名称">
                  <Input value={partyInfo.party_a_name} disabled />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="住所地">
                  <Input value={partyInfo.party_a_address} disabled />
                </Form.Item>
              </Col>
            </Row>
            {docType === "employment_contract" && contractTerms && (
              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Form.Item label="合同类型">
                    <Input value={contractTerms.contract_type} disabled />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label="岗位">
                    <Input value={contractTerms.position} disabled />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label="工作地点">
                    <Input value={contractTerms.work_location} disabled />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label="合同期限">
                    <Input
                      value={`${contractTerms.contract_start_date} 至 ${contractTerms.contract_end_date}`}
                      disabled
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label="月工资（元）">
                    <Input value={contractTerms.monthly_salary} disabled />
                  </Form.Item>
                </Col>
              </Row>
            )}
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
              {docType === "training_pledge" && (
                <>
                  <Col xs={24} sm={8}>
                    <Form.Item label="劳动合同签订日期">
                      <DatePicker
                        style={{ width: "100%" }}
                        format="YYYY年MM月DD日"
                        value={
                          partyInfo.contract_sign_date
                            ? dayjs(partyInfo.contract_sign_date, "YYYY年MM月DD日")
                            : null
                        }
                        onChange={(date) =>
                          setPartyInfo({
                            ...partyInfo,
                            contract_sign_date: date ? date.format("YYYY年MM月DD日") : "",
                          })
                        }
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item label="合同开始日期">
                      <DatePicker
                        style={{ width: "100%" }}
                        format="YYYY年MM月DD日"
                        value={
                          partyInfo.contract_start_date
                            ? dayjs(partyInfo.contract_start_date, "YYYY年MM月DD日")
                            : null
                        }
                        onChange={(date) =>
                          setPartyInfo({
                            ...partyInfo,
                            contract_start_date: date ? date.format("YYYY年MM月DD日") : "",
                          })
                        }
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item label="合同结束日期">
                      <DatePicker
                        style={{ width: "100%" }}
                        format="YYYY年MM月DD日"
                        value={
                          partyInfo.contract_end_date
                            ? dayjs(partyInfo.contract_end_date, "YYYY年MM月DD日")
                            : null
                        }
                        onChange={(date) =>
                          setPartyInfo({
                            ...partyInfo,
                            contract_end_date: date ? date.format("YYYY年MM月DD日") : "",
                          })
                        }
                      />
                    </Form.Item>
                  </Col>
                </>
              )}
            </Row>
          </Form>
        </Card>
      )}

      {/* Signature panel - only on last page when not signed */}
      {!isSigned && isLastPage && !hrDataMissing && (
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

            <div>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                登录密码（签署身份验证）：
              </Text>
              <Input.Password
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入您的登录密码以确认签署"
                style={{ maxWidth: 300 }}
                disabled={isPaginated && maxPageReached < totalPages - 1}
                autoComplete="current-password"
              />
            </div>

            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={handleSign}
              loading={signing}
              disabled={
                !agreed ||
                !password ||
                signatureName.trim() !== expectedSignatureName ||
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
