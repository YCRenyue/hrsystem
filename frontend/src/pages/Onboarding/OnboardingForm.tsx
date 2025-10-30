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
  message,
  Upload,
  Result,
  Spin,
} from 'antd';
import {
  UploadOutlined,
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
  }, [token]);

  const fetchOnboardingForm = async () => {
    try {
      const response = await apiClient.get(`/onboarding/form/${token}`);
      setOnboardingData(response.data.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        message.error('Invalid or expired onboarding link');
      } else {
        message.error('Failed to load onboarding form');
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
      message.success('Onboarding information submitted successfully!');
      setCompleted(true);
    } catch (error: any) {
      message.error(
        error.response?.data?.message || 'Failed to submit onboarding information'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="onboarding-loading">
        <Spin size="large" />
        <p>Loading your onboarding form...</p>
      </div>
    );
  }

  if (!onboardingData) {
    return (
      <div className="onboarding-container">
        <Result
          status="error"
          title="Invalid Onboarding Link"
          subTitle="This link may have expired or is invalid. Please contact HR for assistance."
        />
      </div>
    );
  }

  if (completed) {
    return (
      <div className="onboarding-container">
        <Result
          status="success"
          title="Onboarding Completed!"
          subTitle="Thank you for completing your onboarding information. HR will review your submission."
          extra={[
            <Button type="primary" key="dashboard" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
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
          <h1>Welcome to the Company!</h1>
          <p>Please complete your onboarding information below</p>
        </div>

        <Card type="inner" title="Your Information" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <strong>Name:</strong> {onboardingData.employee_info.name}
            </Col>
            <Col span={12}>
              <strong>Employee #:</strong> {onboardingData.employee_info.employee_number}
            </Col>
            <Col span={12}>
              <strong>Department:</strong> {onboardingData.employee_info.department}
            </Col>
            <Col span={12}>
              <strong>Position:</strong> {onboardingData.employee_info.position}
            </Col>
            <Col span={12}>
              <strong>Hire Date:</strong>{' '}
              {dayjs(onboardingData.employee_info.hire_date).format('YYYY-MM-DD')}
            </Col>
          </Row>
        </Card>

        <Form form={form} layout="vertical" onFinish={onFinish}>
          <h3>Personal Information</h3>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Phone Number"
                name="phone"
                rules={[
                  { required: true, message: 'Please input your phone number!' },
                  {
                    pattern: /^1[3-9]\d{9}$/,
                    message: 'Invalid phone number format',
                  },
                ]}
              >
                <Input placeholder="11-digit phone number" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Please input your email!' },
                  { type: 'email', message: 'Invalid email format' },
                ]}
              >
                <Input placeholder="email@example.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Gender"
                name="gender"
                rules={[{ required: true, message: 'Please select your gender!' }]}
              >
                <Select placeholder="Select Gender">
                  <Option value={Gender.MALE}>Male</Option>
                  <Option value={Gender.FEMALE}>Female</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Birth Date"
                name="birth_date"
                rules={[{ required: true, message: 'Please select your birth date!' }]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="ID Card Number"
            name="id_card"
            rules={[
              { required: true, message: 'Please input your ID card number!' },
              {
                pattern: /^[0-9]{17}[0-9Xx]$/,
                message: 'Invalid ID card format (18 digits)',
              },
            ]}
          >
            <Input placeholder="18-digit ID card number" />
          </Form.Item>

          <Form.Item label="Home Address" name="address">
            <TextArea rows={2} placeholder="Your home address" />
          </Form.Item>

          <h3>Emergency Contact</h3>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Emergency Contact Name"
                name="emergency_contact"
                rules={[
                  { required: true, message: 'Please input emergency contact name!' },
                ]}
              >
                <Input placeholder="Full Name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Emergency Contact Phone"
                name="emergency_phone"
                rules={[
                  { required: true, message: 'Please input emergency contact phone!' },
                  {
                    pattern: /^1[3-9]\d{9}$/,
                    message: 'Invalid phone number format',
                  },
                ]}
              >
                <Input placeholder="11-digit phone number" />
              </Form.Item>
            </Col>
          </Row>

          <h3>ID Card Upload</h3>
          <p style={{ color: '#999', marginBottom: 16 }}>
            Please upload clear photos of both sides of your ID card
          </p>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="ID Card Front">
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
                  <p className="ant-upload-text">Click or drag to upload</p>
                </Dragger>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="ID Card Back">
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
                  <p className="ant-upload-text">Click or drag to upload</p>
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
              Submit Onboarding Information
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default OnboardingForm;
