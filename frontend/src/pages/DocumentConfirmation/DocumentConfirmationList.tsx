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
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  DownloadOutlined,
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

const PAGE_SIZE = 10;

const DocumentConfirmationList: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [activeTab, setActiveTab] = useState<DocumentType>("policy_ack");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params: EmployeeQueryParams = {
        page,
        size: PAGE_SIZE,
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
  }, [page, message]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const getFilteredEmployees = () => {
    if (!statusFilter) return employees;
    const statusField =
      activeTab === "policy_ack"
        ? "policy_ack_status"
        : "training_pledge_status";
    const isSigned = statusFilter === "signed";
    return employees.filter((emp) => !!emp[statusField] === isSigned);
  };

  const filteredEmployees = getFilteredEmployees();

  const signedCount = employees.filter((emp) =>
    activeTab === "policy_ack"
      ? emp.policy_ack_status
      : emp.training_pledge_status
  ).length;

  const pendingCount = employees.length - signedCount;

  const handleDownload = async (employeeId: string) => {
    try {
      const urls: FileUrls =
        await uploadService.getEmployeeFileUrls(employeeId);
      const url =
        activeTab === "policy_ack"
          ? urls.policy_ack_url
          : urls.training_pledge_url;
      if (url) {
        window.open(url, "_blank");
      } else {
        message.warning("No signed document file found");
      }
    } catch (error: any) {
      message.error("Failed to get file URL");
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
        return signedAt
          ? dayjs(signedAt).format("YYYY-MM-DD HH:mm")
          : "-";
      },
    },
    {
      title: "操作",
      key: "actions",
      width: 160,
      render: (_: unknown, record: Employee) => {
        const isSigned =
          activeTab === "policy_ack"
            ? record.policy_ack_status
            : record.training_pledge_status;
        const hasFile =
          activeTab === "policy_ack"
            ? record.has_policy_ack_file
            : record.has_training_pledge_file;
        return (
          <Space>
            <Button
              type="link"
              icon={<EyeOutlined />}
              size="small"
              onClick={() =>
                navigate(
                  `/document-confirmations/${record.employee_id}/${activeTab}`
                )
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
      label: "公司制度阅读确认表",
    },
    {
      key: "training_pledge",
      label: "员工培训承诺函",
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic title="总员工数" value={employees.length} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="已签署"
              value={signedCount}
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
              onChange={setStatusFilter}
              options={[
                { label: "已签署", value: "signed" },
                { label: "待签署", value: "pending" },
              ]}
            />
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={filteredEmployees}
          rowKey="employee_id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: (t) => `共 ${t} 条`,
          }}
        />
      </Card>
    </div>
  );
};

export default DocumentConfirmationList;
