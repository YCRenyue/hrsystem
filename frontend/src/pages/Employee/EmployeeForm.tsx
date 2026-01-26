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
  Space,
  Alert,
  App,
  Upload,
  Image,
  Divider,
  Popconfirm,
} from 'antd';
import {
  SaveOutlined,
  ArrowLeftOutlined,
  InfoCircleOutlined,
  InboxOutlined,
  DeleteOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Gender,
  EmploymentType,
  EmployeeCreateInput,
} from '../../types';
import { employeeService } from '../../services/employeeService';
import { departmentService } from '../../services/departmentService';
import { uploadService, FileType, FileUrls } from '../../services/uploadService';
import { usePermission } from '../../hooks/usePermission';
import type { Department } from '../../types';

const { Option } = Select;
const { TextArea } = Input;
const { Dragger } = Upload;

const EmployeeForm: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { role, isAdmin, isDepartmentManager } = usePermission();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const { message, notification } = App.useApp();

  // 文件上传状态
  const [fileUrls, setFileUrls] = useState<FileUrls>({
    id_card_front_url: null,
    id_card_back_url: null,
    bank_card_url: null,
    diploma_url: null,
  });
  const [uploadingType, setUploadingType] = useState<FileType | null>(null);

  const isEditMode = !!id && id !== 'new';

  // Determine which fields are editable based on role
  const canEditField = (fieldName: string): boolean => {
    // Admin and HR can edit all fields
    if (isAdmin || role === 'hr_admin') {
      return true;
    }

    // Department manager can only edit limited fields
    if (isDepartmentManager) {
      const editableFields = ['phone', 'email', 'position', 'emergency_contact', 'emergency_phone'];
      return editableFields.includes(fieldName);
    }

    // Regular employees can't use this form
    return false;
  };

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

      // Populate form with employee data
      form.setFieldsValue({
        ...data,
        entry_date: data.entry_date ? dayjs(data.entry_date) : null,
        probation_end_date: data.probation_end_date
          ? dayjs(data.probation_end_date)
          : null,
        birth_date: data.birth_date ? dayjs(data.birth_date) : null,
      });

      // 如果有文件，获取签名URL
      if (
        data.has_id_card_front ||
        data.has_id_card_back ||
        data.has_bank_card_image ||
        data.has_diploma_image
      ) {
        const urls = await uploadService.getEmployeeFileUrls(id);
        setFileUrls(urls);
      }
    } catch (error) {
      message.error('加载员工数据失败');
    }
  };

  const handleFileUpload = async (file: File, fileType: FileType) => {
    if (!id) {
      message.warning('请先保存员工基本信息后再上传文件');
      return;
    }

    setUploadingType(fileType);
    try {
      const result = await uploadService.uploadEmployeeFile(id, file, fileType);
      if (result.url) {
        setFileUrls((prev) => ({
          ...prev,
          [`${fileType}_url`]: result.url,
        }));
        message.success('文件上传成功');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '文件上传失败');
    } finally {
      setUploadingType(null);
    }
  };

  const handleFileDelete = async (fileType: FileType) => {
    if (!id) return;

    try {
      await uploadService.deleteEmployeeFile(id, fileType);
      setFileUrls((prev) => ({
        ...prev,
        [`${fileType}_url`]: null,
      }));
      message.success('文件删除成功');
    } catch (error: any) {
      message.error(error.response?.data?.message || '文件删除失败');
    }
  };

  const renderFileUploader = (fileType: FileType, label: string) => {
    const urlKey = `${fileType}_url` as keyof FileUrls;
    const uploadedUrl = fileUrls[urlKey];
    const isUploading = uploadingType === fileType;

    if (uploadedUrl) {
      return (
        <div style={{ textAlign: 'center' }}>
          <Image
            src={uploadedUrl}
            alt={label}
            style={{ maxWidth: '100%', maxHeight: 150, objectFit: 'contain' }}
          />
          <div style={{ marginTop: 8 }}>
            <Popconfirm
              title="确认删除"
              description="确定要删除此文件吗？删除后无法恢复。"
              onConfirm={() => handleFileDelete(fileType)}
              okText="确认删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Popconfirm>
          </div>
        </div>
      );
    }

    return (
      <Dragger
        maxCount={1}
        accept="image/*"
        showUploadList={false}
        disabled={isUploading || !isEditMode}
        beforeUpload={(file) => {
          handleFileUpload(file, fileType);
          return false;
        }}
      >
        <p className="ant-upload-drag-icon">
          {isUploading ? <LoadingOutlined /> : <InboxOutlined />}
        </p>
        <p className="ant-upload-text">
          {isUploading ? '上传中...' : '点击或拖拽上传'}
        </p>
        {!isEditMode && (
          <p className="ant-upload-hint" style={{ color: '#999' }}>
            请先保存员工信息
          </p>
        )}
      </Dragger>
    );
  };

  useEffect(() => {
    fetchDepartments();
    if (isEditMode) {
      fetchEmployee();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const formData: EmployeeCreateInput = {
        ...values,
        entry_date: values.entry_date?.format('YYYY-MM-DD'),
        probation_end_date: values.probation_end_date?.format('YYYY-MM-DD'),
        birth_date: values.birth_date?.format('YYYY-MM-DD'),
      };

      if (isEditMode && id) {
        await employeeService.updateEmployee(id, formData);
        notification.success({
          message: '操作成功',
          description: '员工信息更新成功',
          placement: 'topRight',
          duration: 0.5,
          onClose: () => navigate('/employees'),
        });
      } else {
        await employeeService.createEmployee(formData);
        notification.success({
          message: '创建成功',
          description: '员工创建成功！入职登记表邮件将在入职当天早上9点自动发送',
          placement: 'topRight',
          duration: 0.5,
          onClose: () => navigate('/employees'),
        });
      }
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || errorData?.error || errorData?.msg;
      const finalMessage = errorMessage || `${isEditMode ? '更新' : '创建'}员工失败`;
      notification.error({
        message: '操作失败',
        description: finalMessage,
        placement: 'topRight',
        duration: 0,
      });
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

      {/* Show notice for department managers about limited editing */}
      {isDepartmentManager && isEditMode && (
        <Alert
          message="编辑权限提示"
          description="作为部门经理，您只能编辑员工的联系方式和职位信息。完整的员工信息需要HR管理员权限。"
          type="info"
          icon={<InfoCircleOutlined />}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card title={isEditMode ? '编辑员工信息' : '添加新员工'}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            gender: Gender.MALE,
            employment_type: EmploymentType.FULL_TIME,
            status: 'pending',
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
                <Input placeholder="例如：EMP001" disabled={isEditMode || !canEditField('employee_number')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="姓名"
                name="name"
                rules={[{ required: true, message: '请输入姓名！' }]}
              >
                <Input placeholder="姓名" disabled={!canEditField('name')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="英文名" name="name_en">
                <Input placeholder="英文名（选填）" disabled={!canEditField('name_en')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="性别"
                name="gender"
                rules={[{ required: true, message: '请选择性别！' }]}
              >
                <Select disabled={!canEditField('gender')}>
                  <Option value={Gender.MALE}>男</Option>
                  <Option value={Gender.FEMALE}>女</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="出生日期" name="birth_date">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" disabled={!canEditField('birth_date')} />
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
                <Input placeholder="18位身份证号" disabled={!canEditField('id_card')} />
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
                <Input placeholder="11位手机号" disabled={!canEditField('phone')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱地址！' },
                  { type: 'email', message: '邮箱格式不正确' }
                ]}
                tooltip="用于发送入职登记表链接"
              >
                <Input placeholder="email@example.com" disabled={!canEditField('email')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="入职日期"
                name="entry_date"
                rules={[{ required: true, message: '请选择入职日期！' }]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" disabled={!canEditField('entry_date')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="试用期结束日期" name="probation_end_date">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" disabled={!canEditField('probation_end_date')} />
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
                <Select placeholder="选择部门" disabled={!canEditField('department_id')}>
                  {departments.map((dept) => (
                    <Option key={dept.department_id} value={dept.department_id}>
                      {dept.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="职位"
                name="position"
                rules={[{ required: true, message: '请输入职位！' }]}
              >
                <Input placeholder="员工" disabled={!canEditField('position')} />
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
                <Select disabled={!canEditField('employment_type')}>
                  <Option value={EmploymentType.FULL_TIME}>全职</Option>
                  <Option value={EmploymentType.PART_TIME}>兼职</Option>
                  <Option value={EmploymentType.INTERN}>实习</Option>
                  <Option value={EmploymentType.CONTRACTOR}>合同工</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="在职状态" name="status">
                <Select disabled={!canEditField('status')}>
                  <Option value="pending">待入职</Option>
                  <Option value="active">在职</Option>
                  <Option value="inactive">离职</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="工作地点" name="work_location">
                <Input placeholder="办公地点" disabled={!canEditField('work_location')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="紧急联系人" name="emergency_contact">
                <Input placeholder="紧急联系人姓名" disabled={!canEditField('emergency_contact')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="紧急联系电话" name="emergency_phone">
                <Input placeholder="紧急联系人电话" disabled={!canEditField('emergency_phone')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="钉钉用户ID" name="dingtalk_user_id">
                <Input placeholder="钉钉用户ID" disabled={!canEditField('dingtalk_user_id')} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="家庭地址" name="address">
            <TextArea rows={2} placeholder="家庭地址" disabled={!canEditField('address')} />
          </Form.Item>

          <Form.Item label="备注" name="remarks">
            <TextArea rows={3} placeholder="其他备注信息" disabled={!canEditField('remarks')} />
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

        {/* 证件资料上传区域 */}
        <Divider />
        <h3>证件资料上传</h3>
        <p style={{ color: '#999', marginBottom: 16 }}>
          {isEditMode
            ? '上传员工的身份证、银行卡和毕业证书照片'
            : '请先保存员工基本信息后再上传证件资料'}
        </p>

        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" title="身份证正面">
              {renderFileUploader('id_card_front', '身份证正面')}
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" title="身份证反面">
              {renderFileUploader('id_card_back', '身份证反面')}
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" title="银行卡">
              {renderFileUploader('bank_card', '银行卡')}
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" title="毕业证书">
              {renderFileUploader('diploma', '毕业证书')}
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default EmployeeForm;
