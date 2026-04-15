/**
 * Document Confirmation List Page
 * HR view for tracking policy confirmations and training commitments
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Select,
  Tabs,
  Statistic,
  Row,
  Col,
  App,
  Modal,
  Form,
  InputNumber,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  DownloadOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import { Employee, EmployeeQueryParams } from "../../types";
import { employeeService } from "../../services/employeeService";
import {
  uploadService,
  FileUrls,
} from "../../services/uploadService";

type DocumentType = "policy_ack" | "training_pledge";
type StatusFilter = "signed" | "pending" | undefined;

const PAGE_SIZE = 10;

const DocumentConfirmationList: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [activeTab, setActiveTab] = useState<DocumentType>("policy_ack");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, signed: 0, pending: 0 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>();
  const [pledgeModalVisible, setPledgeModalVisible] = useState(false);
  const [pledgeModalLoading, setPledgeModalLoading] = useState(false);
  const [pledgeTargetId, setPledgeTargetId] = useState<string>("");
  const [pledgeForm] = Form.useForm();

  const getDocumentStatusParams = useCallback(
    (filter?: Exclude<StatusFilter, undefined>): Pick<EmployeeQueryParams, "policy_ack_status" | "training_pledge_status"> => {
      const statusValue = filter === "signed";
      return activeTab === "policy_ack"
        ? { policy_ack_status: statusValue }
        : { training_pledge_status: statusValue };
    },
    [activeTab]
  );

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params: EmployeeQueryParams = {
        page,
        size: PAGE_SIZE,
        ...(statusFilter ? getDocumentStatusParams(statusFilter) : {}),
      };
      const result = await employeeService.getEmployees(params);
      setEmployees(result.items);
      setTotal(result.total);
    } catch (error: any) {
      message.error(
        error.response?.data?.message || "Failed to load employees"
      );
    } finally {
      setLoading(false);
    }
  }, [getDocumentStatusParams, page, statusFilter, message]);

  const fetchStats = useCallback(async () => {
    try {
      const [allResult, signedResult, pendingResult] = await Promise.all([
        employeeService.getEmployees({ page: 1, size: 1 }),
        employeeService.getEmployees({
          page: 1,
          size: 1,
          ...getDocumentStatusParams("signed"),
        }),
        employeeService.getEmployees({
          page: 1,
          size: 1,
          ...getDocumentStatusParams("pending"),
        }),
      ]);

      setStats({
        total: allResult.total,
        signed: signedResult.total,
        pending: pendingResult.total,
      });
    } catch (error: any) {
      message.error(
        error.response?.data?.message || "Failed to load document statistics"
      );
    }
  }, [getDocumentStatusParams, message]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const pendingCount = stats.pending;

  const handleDownload = async (employeeId: string) => {
    try {
      const urls: FileUrls = await uploadService.getEmployeeFileUrls(employeeId);
      const url =
        activeTab === "policy_ack"
          ? urls.policy_ack_url
          : urls.training_pledge_url;
      if (url) {
        window.open(url, "_blank");
      } else {
        message.warning("No signed document file found");
      }
    } catch {
      message.error("Failed to get file URL");
    }
  };

  const handleOpenPledgeModal = async (employeeId: string) => {
    setPledgeTargetId(employeeId);
    pledgeForm.resetFields();
    try {
      const emp = await employeeService.getEmployeeById(employeeId);
      const pledge = (emp as any).trainingPledge;
      if (pledge) {
        pledgeForm.setFieldsValue({
          training_cost: Number(pledge.training_cost),
          service_years: pledge.service_years,
        });
      }
    } catch {
      // no pre-fill if fetch fails
    }
    setPledgeModalVisible(true);
  };

  const handleSavePledge = async () => {
    try {
      const values = await pledgeForm.validateFields();
      setPledgeModalLoading(true);
      await employeeService.saveTrainingPledge(pledgeTargetId, values);
      message.success("培训承诺函信息已保存");
      setPledgeModalVisible(false);
      await Promise.all([fetchEmployees(), fetchStats()]);
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error.response?.data?.message || "保存失败");
    } finally {
      setPledgeModalLoading(false);
    }
  };

  const columns: ColumnsType<Employee> = [
    {
      title: "员工编号",
      dataIndex: "employee_number",
      key: "employee_number",
      width: 120,
    },
    {
      title: "姓名",
      dataIndex: "name",
      key: "name",
      width: 100,
    },
    {
      title: "部门",
      dataIndex: ["department", "name"],
      key: "department",
      width: 150,
    },
    {
      title: "职位",
      dataIndex: "position",
      key: "position",
      width: 120,
    },
    {
      title: "状态",
      key: "status",
      width: 100,
      render: (_: unknown, record: Employee) => {
        const isSigned =
          activeTab === "policy_ack"
            ? record.policy_ack_status
            : record.training_pledge_status;
        return isSigned ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            已签署
          </Tag>
        ) : (
          <Tag icon={<ClockCircleOutlined />} color="warning">
            待签署
          </Tag>
        );
      },
    },
    {
      title: "签署时间",
      key: "signed_at",
      width: 180,
      render: (_: unknown, record: Employee) => {
        const signedAt =
          activeTab === "policy_ack"
            ? record.policy_ack_signed_at
            : record.training_pledge_signed_at;
        return signedAt ? dayjs(signedAt).format("YYYY-MM-DD HH:mm") : "-";
      },
    },
    {
      title: "操作",
      key: "actions",
      width: 220,
      render: (_: unknown, record: Employee) => {
        const isSigned =
          activeTab === "policy_ack"
            ? record.policy_ack_status
            : record.training_pledge_status;
        const hasFile =
          activeTab === "policy_ack"
            ? record.has_policy_ack_file
            : record.has_training_pledge_file;
        const hasPledge = !!(record as any).trainingPledge;

        return (
          <Space>
            {activeTab === "training_pledge" && (
              <Button
                type="link"
                icon={<SettingOutlined />}
                size="small"
                onClick={() => handleOpenPledgeModal(record.employee_id)}
              >
                {hasPledge ? "修改信息" : "配置承诺函"}
              </Button>
            )}
            <Button
              type="link"
              icon={<EyeOutlined />}
              size="small"
              onClick={() =>
                navigate(`/document-confirmations/${record.employee_id}/${activeTab}`)
              }
            >
              {isSigned ? "查看" : "签署"}
            </Button>
            {isSigned && hasFile && (
              <Button
                type="link"
                icon={<DownloadOutlined />}
                size="small"
                onClick={() => handleDownload(record.employee_id)}
              >
                下载
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  const tabItems = [
    {
      key: "policy_ack",
      label: "公司制度阅读确认",
    },
    {
      key: "training_pledge",
      label: "员工培训服务承诺函",
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic title="总员工数" value={stats.total} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="已签署"
              value={stats.signed}
              valueStyle={{ color: "#3f8600" }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="待签署"
              value={pendingCount}
              valueStyle={{ color: "#cf1322" }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key as DocumentType);
            setPage(1);
            setStatusFilter(undefined);
          }}
          items={tabItems}
        />

        <div style={{ marginBottom: 16 }}>
          <Space>
            <Select
              placeholder="筛选状态"
              allowClear
              style={{ width: 150 }}
              value={statusFilter}
              onChange={(value) => {
                setPage(1);
                setStatusFilter(value);
              }}
              options={[
                { label: "已签署", value: "signed" },
                { label: "待签署", value: "pending" },
              ]}
            />
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={employees}
          rowKey="employee_id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: (count) => `共 ${count} 条`,
          }}
        />
      </Card>

      <Modal
        title="配置培训服务承诺函信息"
        open={pledgeModalVisible}
        onOk={handleSavePledge}
        onCancel={() => setPledgeModalVisible(false)}
        confirmLoading={pledgeModalLoading}
        okText="保存"
        cancelText="取消"
        width={480}
      >
        <Form form={pledgeForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="training_cost"
            label="培训总费用（元）"
            rules={[
              { required: true, message: "请输入培训总费用" },
              { type: "number", min: 1, message: "费用必须大于 0" },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              placeholder="请输入实际培训费用，如 5000"
              min={1}
              precision={2}
              addonAfter="元"
            />
          </Form.Item>
          <Form.Item
            name="service_years"
            label="服务年限（年）"
            rules={[
              { required: true, message: "请输入服务年限" },
              { type: "number", min: 1, max: 10, message: "服务年限需在 1-10 年之间" },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              placeholder="请输入服务年限，如 3"
              min={1}
              max={10}
              precision={0}
              addonAfter="年"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DocumentConfirmationList;
