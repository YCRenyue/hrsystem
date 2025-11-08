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
      message.error('加载部门列表失败');
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
      message.error('加载员工数据失败');
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
        message.success('员工信息更新成功');
      } else {
        await employeeService.createEmployee(formData);
        message.success('员工创建成功');
      }

      navigate('/employees');
    } catch (error: any) {
      message.error(
        error.response?.data?.message ||
          `${isEditMode ? '更新' : '创建'}员工失败`
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
        返回列表
      </Button>

      <Card title={isEditMode ? '编辑员工信息' : '添加新员工'}>
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
                label="员工编号"
                name="employee_number"
                rules={[
                  { required: true, message: '请输入员工编号！' },
                ]}
              >
                <Input placeholder="例如：EMP001" disabled={isEditMode} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="姓名"
                name="name"
                rules={[{ required: true, message: '请输入姓名！' }]}
              >
                <Input placeholder="姓名" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="英文名" name="name_en">
                <Input placeholder="英文名（选填）" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="性别"
                name="gender"
                rules={[{ required: true, message: '请选择性别！' }]}
              >
                <Select>
                  <Option value={Gender.MALE}>男</Option>
                  <Option value={Gender.FEMALE}>女</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="出生日期" name="birth_date">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="身份证号"
                name="id_card"
                rules={[
                  {
                    pattern: /^[0-9]{17}[0-9Xx]$/,
                    message: '身份证号格式不正确',
                  },
                ]}
              >
                <Input placeholder="18位身份证号" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="手机号"
                name="phone"
                rules={[
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
                rules={[{ type: 'email', message: '邮箱格式不正确' }]}
              >
                <Input placeholder="email@example.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="入职日期"
                name="hire_date"
                rules={[{ required: true, message: '请选择入职日期！' }]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="试用期结束日期" name="probation_end_date">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="部门"
                name="department_id"
                rules={[{ required: true, message: '请选择部门！' }]}
              >
                <Select placeholder="选择部门">
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
                label="职位"
                name="position_id"
                rules={[{ required: true, message: '请输入职位！' }]}
              >
                <Input placeholder="职位/职称" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="雇佣类型"
                name="employment_type"
                rules={[{ required: true, message: '请选择雇佣类型！' }]}
              >
                <Select>
                  <Option value={EmploymentType.FULL_TIME}>全职</Option>
                  <Option value={EmploymentType.PART_TIME}>兼职</Option>
                  <Option value={EmploymentType.INTERN}>实习</Option>
                  <Option value={EmploymentType.CONTRACTOR}>合同工</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="在职状态" name="employment_status">
                <Select>
                  <Option value={EmploymentStatus.PENDING}>待入职</Option>
                  <Option value={EmploymentStatus.PROBATION}>试用期</Option>
                  <Option value={EmploymentStatus.REGULAR}>正式</Option>
                  <Option value={EmploymentStatus.RESIGNED}>已离职</Option>
                  <Option value={EmploymentStatus.TERMINATED}>已终止</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="工作地点" name="work_location">
                <Input placeholder="办公地点" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="紧急联系人" name="emergency_contact">
                <Input placeholder="紧急联系人姓名" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="紧急联系电话" name="emergency_phone">
                <Input placeholder="紧急联系人电话" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="钉钉用户ID" name="dingtalk_user_id">
                <Input placeholder="钉钉用户ID" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="家庭地址" name="address">
            <TextArea rows={2} placeholder="家庭地址" />
          </Form.Item>

          <Form.Item label="备注" name="remarks">
            <TextArea rows={3} placeholder="其他备注信息" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                {isEditMode ? '更新' : '创建'}员工信息
              </Button>
              <Button onClick={() => navigate('/employees')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default EmployeeForm;
