/**
 * Social Security Form Page - 手工添加一条社保缴纳记录
 * 个人/公司各险种金额由后端按缴费基数自动计算
 */
import React, { useState } from "react";
import {
  Form,
  InputNumber,
  Select,
  DatePicker,
  Input,
  Button,
  Card,
  Space,
  App,
} from "antd";
import { SaveOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs, { Dayjs } from "dayjs";
import api from "../../services/api";
import EmployeeSelect from "../../components/Common/EmployeeSelect";

const { TextArea } = Input;

interface SocialSecurityFormValues {
  employee_id: string;
  year_month: Dayjs;
  social_security_base: number;
  housing_fund_base?: number;
  payment_status: string;
  payment_date?: Dayjs;
  notes?: string;
}

const LIST_PATH = "/social-security";

const SocialSecurityForm: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm<SocialSecurityFormValues>();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: SocialSecurityFormValues) => {
    setSubmitting(true);
    try {
      await api.post("/social-security", {
        ...values,
        year_month: values.year_month.format("YYYY-MM"),
        housing_fund_base: values.housing_fund_base ?? 0,
        payment_date: values.payment_date ? values.payment_date.format("YYYY-MM-DD") : null,
      });
      message.success("社保记录添加成功");
      navigate(LIST_PATH);
    } catch (error: any) {
      message.error(error.response?.data?.message || "保存失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card
      title="添加社保记录"
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(LIST_PATH)}>
          返回列表
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ year_month: dayjs(), payment_status: "pending" }}
        style={{ maxWidth: 600 }}
      >
        <Form.Item
          label="员工"
          name="employee_id"
          rules={[{ required: true, message: "请选择员工" }]}
        >
          <EmployeeSelect />
        </Form.Item>

        <Form.Item
          label="缴纳年月"
          name="year_month"
          rules={[{ required: true, message: "请选择缴纳年月" }]}
        >
          <DatePicker picker="month" style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          label="社保基数"
          name="social_security_base"
          rules={[{ required: true, message: "请输入社保基数" }]}
          extra="各险种个人和公司缴纳金额按基数自动计算"
        >
          <InputNumber min={0} precision={2} style={{ width: "100%" }} addonAfter="元" />
        </Form.Item>

        <Form.Item label="公积金基数" name="housing_fund_base">
          <InputNumber min={0} precision={2} style={{ width: "100%" }} addonAfter="元" />
        </Form.Item>

        <Form.Item label="缴纳状态" name="payment_status">
          <Select
            options={[
              { value: "pending", label: "待缴纳" },
              { value: "paid", label: "已缴纳" },
              { value: "failed", label: "缴纳失败" },
            ]}
          />
        </Form.Item>

        <Form.Item label="缴纳日期" name="payment_date">
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item label="备注" name="notes">
          <TextArea rows={3} placeholder="选填" maxLength={500} showCount />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>
              添加记录
            </Button>
            <Button onClick={() => navigate(LIST_PATH)}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default SocialSecurityForm;
