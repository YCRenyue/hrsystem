/**
 * Employee Form - Create or Edit Employee
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
  Space,
} from 'antd';
import { UploadOutlined, SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Gender,
  EmploymentType,
  EmploymentStatus,
  EmployeeCreateInput,
  Employee,
} from '../../types';
import { employeeService } from '../../services/employeeService';
import { departmentService } from '../../services/departmentService';
import type { Department } from '../../types';

const { Option } = Select;
const { TextArea } = Input;

const EmployeeForm: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);

  const isEditMode = !!id && id !== 'new';

  useEffect(() => {
    fetchDepartments();
    if (isEditMode) {
      fetchEmployee();
    }
  }, [id]);

  const fetchDepartments = async () => {
    try {
      const data = await departmentService.getDepartments();
      setDepartments(data);
    } catch (error) {
      message.error('Failed to load departments');
    }
  };

  const fetchEmployee = async () => {
    if (!id) return;

    try {
      const data = await employeeService.getEmployeeById(id);
      setEmployee(data);

      // Populate form with employee data
      form.setFieldsValue({
        ...data,
        hire_date: data.hire_date ? dayjs(data.hire_date) : null,
        probation_end_date: data.probation_end_date
          ? dayjs(data.probation_end_date)
          : null,
        birth_date: data.birth_date ? dayjs(data.birth_date) : null,
      });
    } catch (error) {
      message.error('Failed to load employee data');
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const formData: EmployeeCreateInput = {
        ...values,
        hire_date: values.hire_date?.format('YYYY-MM-DD'),
        probation_end_date: values.probation_end_date?.format('YYYY-MM-DD'),
        birth_date: values.birth_date?.format('YYYY-MM-DD'),
      };

      if (isEditMode && id) {
        await employeeService.updateEmployee(id, formData);
        message.success('Employee updated successfully');
      } else {
        await employeeService.createEmployee(formData);
        message.success('Employee created successfully');
      }

      navigate('/employees');
    } catch (error: any) {
      message.error(
        error.response?.data?.message ||
          `Failed to ${isEditMode ? 'update' : 'create'} employee`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/employees')}
        style={{ marginBottom: 16 }}
      >
        Back to List
      </Button>

      <Card title={isEditMode ? 'Edit Employee' : 'Add New Employee'}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            gender: Gender.MALE,
            employment_type: EmploymentType.FULL_TIME,
            employment_status: EmploymentStatus.PENDING,
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Employee Number"
                name="employee_number"
                rules={[
                  { required: true, message: 'Please input employee number!' },
                ]}
              >
                <Input placeholder="e.g., EMP001" disabled={isEditMode} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Full Name"
                name="name"
                rules={[{ required: true, message: 'Please input name!' }]}
              >
                <Input placeholder="Full Name" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="English Name" name="name_en">
                <Input placeholder="English Name (Optional)" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Gender"
                name="gender"
                rules={[{ required: true, message: 'Please select gender!' }]}
              >
                <Select>
                  <Option value={Gender.MALE}>Male</Option>
                  <Option value={Gender.FEMALE}>Female</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Birth Date" name="birth_date">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="ID Card Number"
                name="id_card"
                rules={[
                  {
                    pattern: /^[0-9]{17}[0-9Xx]$/,
                    message: 'Invalid ID card format',
                  },
                ]}
              >
                <Input placeholder="18-digit ID card number" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Phone"
                name="phone"
                rules={[
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
                rules={[{ type: 'email', message: 'Invalid email format' }]}
              >
                <Input placeholder="email@example.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Hire Date"
                name="hire_date"
                rules={[{ required: true, message: 'Please select hire date!' }]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Probation End Date" name="probation_end_date">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Department"
                name="department_id"
                rules={[{ required: true, message: 'Please select department!' }]}
              >
                <Select placeholder="Select Department">
                  {departments.map((dept) => (
                    <Option key={dept.department_id} value={dept.department_id}>
                      {dept.department_name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Position"
                name="position_id"
                rules={[{ required: true, message: 'Please input position!' }]}
              >
                <Input placeholder="Position/Title" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Employment Type"
                name="employment_type"
                rules={[{ required: true, message: 'Please select employment type!' }]}
              >
                <Select>
                  <Option value={EmploymentType.FULL_TIME}>Full Time</Option>
                  <Option value={EmploymentType.PART_TIME}>Part Time</Option>
                  <Option value={EmploymentType.INTERN}>Intern</Option>
                  <Option value={EmploymentType.CONTRACTOR}>Contractor</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Employment Status" name="employment_status">
                <Select>
                  <Option value={EmploymentStatus.PENDING}>Pending</Option>
                  <Option value={EmploymentStatus.PROBATION}>Probation</Option>
                  <Option value={EmploymentStatus.REGULAR}>Regular</Option>
                  <Option value={EmploymentStatus.RESIGNED}>Resigned</Option>
                  <Option value={EmploymentStatus.TERMINATED}>Terminated</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Work Location" name="work_location">
                <Input placeholder="Office Location" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Emergency Contact" name="emergency_contact">
                <Input placeholder="Emergency Contact Name" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Emergency Phone" name="emergency_phone">
                <Input placeholder="Emergency Contact Phone" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="DingTalk User ID" name="dingtalk_user_id">
                <Input placeholder="DingTalk User ID" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Address" name="address">
            <TextArea rows={2} placeholder="Home Address" />
          </Form.Item>

          <Form.Item label="Remarks" name="remarks">
            <TextArea rows={3} placeholder="Additional Notes" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                {isEditMode ? 'Update' : 'Create'} Employee
              </Button>
              <Button onClick={() => navigate('/employees')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default EmployeeForm;
