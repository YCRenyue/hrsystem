/**
 * Annual Leave Form Page - Create or edit annual leave records
 * Automatically calculates remaining days based on input values
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  Form,
  InputNumber,
  Select,
  DatePicker,
  Input,
  Button,
  Card,
  Space,
  Statistic,
  Row,
  Col,
  App,
} from "antd";
import { SaveOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import api from "../../services/api";

const { Option } = Select;
const { TextArea } = Input;

interface EmployeeOption {
  employee_id: string;
  employee_number: string;
  name: string;
}

const AnnualLeaveForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { message } = App.useApp();

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [remainingDays, setRemainingDays] = useState<number>(0);

  // Recalculate remaining days whenever relevant fields change
  const recalculate = useCallback(() => {
    const total = parseFloat(form.getFieldValue("total_days") ?? 0) || 0;
    const used = parseFloat(form.getFieldValue("used_days") ?? 0) || 0;
    const carryOver = parseFloat(form.getFieldValue("carry_over_days") ?? 0) || 0;
    setRemainingDays(total + carryOver - used);
  }, [form]);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await api.get("/employees", { params: { size: 500 } });
      if (response.data.success) {
        const list = response.data.data || [];
        setEmployees(
          list.map((e: any) => ({
            employee_id: e.employee_id,
            employee_number: e.employee_number,
            name: e.name || e.employee_name || "",
          }))
        );
      }
    } catch {
      message.error("获取员工列表失败");
    }
  }, [message]);

  const fetchRecord = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await api.get(`/annual-leave/${id}`);
      if (response.data.success) {
        const record = response.data.data;
        form.setFieldsValue({
          employee_id: record.employee_id,
          year: record.year,
          total_days: record.total_days,
          used_days: record.used_days,
          carry_over_days: record.carry_over_days ?? 0,
          expiry_date: record.expiry_date ? dayjs(record.expiry_date) : null,
          notes: record.notes,
        });
        const total = parseFloat(record.total_days) || 0;
        const used = parseFloat(record.used_days) || 0;
        const carryOver = parseFloat(record.carry_over_days) || 0;
        setRemainingDays(total + carryOver - used);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || "获取年假记录失败");
    } finally {
      setLoading(false);
    }
  }, [id, form, message]);

  useEffect(() => {
    fetchEmployees();
    fetchRecord();
  }, [fetchEmployees, fetchRecord]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        expiry_date: values.expiry_date
          ? values.expiry_date.format("YYYY-MM-DD")
          : null,
      };

      if (isEdit) {
        await api.put(`/annual-leave/${id}`, payload);
        message.success("年假记录更新成功");
      } else {
        await api.post("/annual-leave", payload);
        message.success("年假记录添加成功");
      }
      navigate("/annual-leave");
    } catch (error: any) {
      message.error(error.response?.data?.message || "保存失败");
    } finally {
      setSubmitting(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear + 1 - i);

  const remainingColor =
    remainingDays > 5 ? "#52c41a" : remainingDays > 0 ? "#faad14" : "#ff4d4f";

  return (
    <div>
      <Card
        title={isEdit ? "编辑年假记录" : "添加年假记录"}
        loading={loading}
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/annual-leave")}>
            返回列表
          </Button>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onValuesChange={recalculate}
          initialValues={{ year: currentYear, used_days: 0, carry_over_days: 0 }}
          style={{ maxWidth: 600 }}
        >
          <Form.Item
            label="员工"
            name="employee_id"
            rules={[{ required: true, message: "请选择员工" }]}
          >
            <Select
              showSearch
              placeholder="搜索员工姓名或工号"
              optionFilterProp="label"
              disabled={isEdit}
              options={employees.map((e) => ({
                value: e.employee_id,
                label: `${e.employee_number} - ${e.name}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="年度"
            name="year"
            rules={[{ required: true, message: "请选择年度" }]}
          >
            <Select disabled={isEdit}>
              {years.map((y) => (
                <Option key={y} value={y}>
                  {y} 年
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="应休天数"
            name="total_days"
            rules={[{ required: true, message: "请输入应休天数" }]}
          >
            <InputNumber min={0} step={0.5} precision={1} style={{ width: "100%" }} addonAfter="天" />
          </Form.Item>

          <Form.Item label="已休天数" name="used_days">
            <InputNumber min={0} step={0.5} precision={1} style={{ width: "100%" }} addonAfter="天" />
          </Form.Item>

          <Form.Item label="结转天数" name="carry_over_days">
            <InputNumber min={0} step={0.5} precision={1} style={{ width: "100%" }} addonAfter="天" />
          </Form.Item>

          {/* Auto-calculated remaining days display */}
          <Row style={{ marginBottom: 24 }}>
            <Col span={24}>
              <Card
                size="small"
                style={{ background: "#fafafa", borderColor: remainingColor }}
              >
                <Statistic
                  title="剩余天数（自动计算：应休 + 结转 - 已休）"
                  value={remainingDays}
                  suffix="天"
                  valueStyle={{ color: remainingColor, fontSize: 28 }}
                  precision={1}
                />
              </Card>
            </Col>
          </Row>

          <Form.Item label="过期日期" name="expiry_date">
            <DatePicker style={{ width: "100%" }} placeholder="结转天数的过期日期（选填）" />
          </Form.Item>

          <Form.Item label="备注" name="notes">
            <TextArea rows={3} placeholder="选填" maxLength={500} showCount />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={submitting}
              >
                {isEdit ? "保存修改" : "添加记录"}
              </Button>
              <Button onClick={() => navigate("/annual-leave")}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default AnnualLeaveForm;
