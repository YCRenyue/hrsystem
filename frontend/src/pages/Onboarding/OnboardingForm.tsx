/**
 * Onboarding Form - Employee self-service information completion
 */
import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Card,
  Row,
  Col,
  Upload,
  Result,
  Spin,
  App,
} from 'antd';
import {
  CheckCircleOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import type { UploadFile } from 'antd/es/upload/interface';
import dayjs from 'dayjs';
import { Gender } from '../../types';
import apiClient from '../../services/api';
import './OnboardingForm.css';

const { Option } = Select;
const { TextArea } = Input;
const { Dragger } = Upload;

interface OnboardingData {
  employee_info: {
    name: string;
    employee_number: string;
    department: string;
    position: string;
    hire_date: string;
  };
  form_fields: Array<{
    field: string;
    label: string;
    type: string;
    required: boolean;
  }>;
}

const OnboardingForm: React.FC = () => {
  const [form] = Form.useForm();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [idCardFront, setIdCardFront] = useState<UploadFile[]>([]);
  const [idCardBack, setIdCardBack] = useState<UploadFile[]>([]);

  useEffect(() => {
    if (token) {
      fetchOnboardingForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchOnboardingForm = async () => {
    try {
      const response = await apiClient.get(`/onboarding/form/${token}`);
      setOnboardingData(response.data.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        message.error('无效或过期的入职链接');
      } else {
        message.error('加载入职表单失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      const formData = {
        ...values,
        birth_date: values.birth_date?.format('YYYY-MM-DD'),
      };

      await apiClient.post(`/onboarding/form/${token}`, formData);
      message.success('入职信息提交成功！');
      setCompleted(true);
    } catch (error: any) {
      message.error(
        error.response?.data?.message || '提交入职信息失败'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="onboarding-loading">
        <Spin size="large" />
        <p>正在加载入职表单...</p>
      </div>
    );
  }

  if (!onboardingData) {
    return (
      <div className="onboarding-container">
        <Result
          status="error"
          title="无效的入职链接"
          subTitle="此链接可能已过期或无效。请联系人力资源部门寻求帮助。"
        />
      </div>
    );
  }

  if (completed) {
    return (
      <div className="onboarding-container">
        <Result
          status="success"
          title="入职完成！"
          subTitle="感谢您完成入职信息。人力资源部门将审核您的提交。"
          extra={[
            <Button type="primary" key="dashboard" onClick={() => navigate('/dashboard')}>
              前往仪表板
            </Button>,
          ]}
        />
      </div>
    );
  }

  return (
    <div className="onboarding-container">
      <Card className="onboarding-card">
        <div className="onboarding-header">
          <h1>欢迎加入公司！</h1>
          <p>请完善您的入职信息</p>
        </div>

        <Card type="inner" title="您的信息" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <strong>姓名：</strong> {onboardingData.employee_info.name}
            </Col>
            <Col span={12}>
              <strong>员工编号：</strong> {onboardingData.employee_info.employee_number}
            </Col>
            <Col span={12}>
              <strong>部门：</strong> {onboardingData.employee_info.department}
            </Col>
            <Col span={12}>
              <strong>职位：</strong> {onboardingData.employee_info.position}
            </Col>
            <Col span={12}>
              <strong>入职日期：</strong>{' '}
              {dayjs(onboardingData.employee_info.hire_date).format('YYYY-MM-DD')}
            </Col>
          </Row>
        </Card>

        <Form form={form} layout="vertical" onFinish={onFinish}>
          <h3>个人信息</h3>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="手机号"
                name="phone"
                rules={[
                  { required: true, message: '请输入您的手机号！' },
                  {
                    pattern: /^1[3-9]\d{9}$/,
                    message: '手机号格式不正确',
                  },
                ]}
              >
                <Input placeholder="11位手机号" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { required: true, message: '请输入您的邮箱！' },
                  { type: 'email', message: '邮箱格式不正确' },
                ]}
              >
                <Input placeholder="email@example.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="性别"
                name="gender"
                rules={[{ required: true, message: '请选择您的性别！' }]}
              >
                <Select placeholder="选择性别">
                  <Option value={Gender.MALE}>男</Option>
                  <Option value={Gender.FEMALE}>女</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="出生日期"
                name="birth_date"
                rules={[{ required: true, message: '请选择您的出生日期！' }]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="身份证号"
            name="id_card"
            rules={[
              { required: true, message: '请输入您的身份证号！' },
              {
                pattern: /^[0-9]{17}[0-9Xx]$/,
                message: '身份证号格式不正确（18位）',
              },
            ]}
          >
            <Input placeholder="18位身份证号" />
          </Form.Item>

          <Form.Item label="家庭地址" name="address">
            <TextArea rows={2} placeholder="您的家庭地址" />
          </Form.Item>

          <h3>紧急联系人</h3>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="紧急联系人姓名"
                name="emergency_contact"
                rules={[
                  { required: true, message: '请输入紧急联系人姓名！' },
                ]}
              >
                <Input placeholder="姓名" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="紧急联系人电话"
                name="emergency_phone"
                rules={[
                  { required: true, message: '请输入紧急联系人电话！' },
                  {
                    pattern: /^1[3-9]\d{9}$/,
                    message: '手机号格式不正确',
                  },
                ]}
              >
                <Input placeholder="11位手机号" />
              </Form.Item>
            </Col>
          </Row>

          <h3>身份证上传</h3>
          <p style={{ color: '#999', marginBottom: 16 }}>
            请上传身份证正反面清晰照片
          </p>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="身份证正面">
                <Dragger
                  fileList={idCardFront}
                  maxCount={1}
                  accept="image/*"
                  beforeUpload={() => false}
                  onChange={({ fileList }) => setIdCardFront(fileList)}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">点击或拖拽文件上传</p>
                </Dragger>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="身份证反面">
                <Dragger
                  fileList={idCardBack}
                  maxCount={1}
                  accept="image/*"
                  beforeUpload={() => false}
                  onChange={({ fileList }) => setIdCardBack(fileList)}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">点击或拖拽文件上传</p>
                </Dragger>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<CheckCircleOutlined />}
              loading={submitting}
              size="large"
              block
              style={{ marginTop: 24 }}
            >
              提交入职信息
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default OnboardingForm;
