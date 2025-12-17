/**
 * Employee Detail Page - View employee information
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  Spin,
  App,
  Divider,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  IdcardOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  ContactsOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Employee } from '../../types';
import { employeeService } from '../../services/employeeService';
import { usePermission } from '../../hooks/usePermission';
import './EmployeeDetail.css';

const EmployeeDetail: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const { canUpdateEmployee, canViewSensitive } = usePermission();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchEmployee = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const data = await employeeService.getEmployeeById(id);
      setEmployee(data);
    } catch (error: any) {
      message.error(error.response?.data?.message || '获取员工信息失败');
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const getGenderText = (gender?: string): string => {
    const genderMap: Record<string, string> = {
      male: '男',
      female: '女',
    };
    return gender ? genderMap[gender] || gender : '-';
  };

  const getEmploymentTypeText = (type?: string): string => {
    const typeMap: Record<string, string> = {
      full_time: '全职',
      part_time: '兼职',
      intern: '实习',
      contractor: '合同工',
    };
    return type ? typeMap[type] || type : '-';
  };

  const getEmploymentStatusText = (status?: string): string => {
    const statusMap: Record<string, string> = {
      pending: '待入职',
      probation: '试用期',
      regular: '正式',
      resigned: '已离职',
      terminated: '已终止',
    };
    return status ? statusMap[status] || status : '-';
  };

  const getEmploymentStatusColor = (status?: string): string => {
    const colorMap: Record<string, string> = {
      pending: 'orange',
      probation: 'blue',
      regular: 'green',
      resigned: 'red',
      terminated: 'red',
    };
    return status ? colorMap[status] || 'default' : 'default';
  };

  const maskSensitiveData = (value: string | undefined, type: 'phone' | 'id_card'): string => {
    if (!value) return '-';
    if (canViewSensitive()) return value;

    if (type === 'phone') {
      // Show first 3 and last 4 digits, mask middle with ****
      return value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    } else if (type === 'id_card') {
      // Show first 6 and last 4 digits, mask middle with ********
      return value.replace(/^(\d{6})\d{8}(\d{4})$/, '$1********$2');
    }

    return value;
  };

  const formatDate = (date: string | undefined): string => {
    return date ? dayjs(date).format('YYYY-MM-DD') : '-';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!employee) {
    return null;
  }

  return (
    <div className="employee-detail-container">
      <div className="employee-detail-header">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/employees')}
          style={{ marginBottom: 16 }}
        >
          返回列表
        </Button>

        {canUpdateEmployee() && (
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/employees/${id}/edit`)}
          >
            编辑信息
          </Button>
        )}
      </div>

      <Card
        title={
          <Space>
            <UserOutlined />
            <span>员工详细信息</span>
          </Space>
        }
        className="employee-detail-card"
      >
        {/* Basic Information */}
        <Descriptions
          title="基本信息"
          bordered
          column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
          labelStyle={{ fontWeight: 500, width: '150px' }}
        >
          <Descriptions.Item label="员工编号">
            <Tag color="blue">{employee.employee_number || '-'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="在职状态">
            <Tag color={getEmploymentStatusColor(employee.employment_status)}>
              {getEmploymentStatusText(employee.employment_status)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="姓名">
            <strong>{employee.name || '-'}</strong>
          </Descriptions.Item>
          <Descriptions.Item label="英文名">
            {employee.name_en || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="性别">
            {getGenderText(employee.gender)}
          </Descriptions.Item>
          <Descriptions.Item label="出生日期">
            <Space>
              <CalendarOutlined />
              {formatDate(employee.birth_date)}
            </Space>
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        {/* Contact Information */}
        <Descriptions
          title="联系方式"
          bordered
          column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
          labelStyle={{ fontWeight: 500, width: '150px' }}
        >
          <Descriptions.Item label="手机号">
            <Space>
              <PhoneOutlined />
              {maskSensitiveData(employee.phone, 'phone')}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="邮箱">
            <Space>
              <MailOutlined />
              {employee.email || '-'}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="身份证号">
            <Space>
              <IdcardOutlined />
              {maskSensitiveData(employee.id_card, 'id_card')}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="家庭地址">
            <Space>
              <EnvironmentOutlined />
              {employee.address || '-'}
            </Space>
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        {/* Employment Information */}
        <Descriptions
          title="就职信息"
          bordered
          column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
          labelStyle={{ fontWeight: 500, width: '150px' }}
        >
          <Descriptions.Item label="部门">
            <Space>
              <TeamOutlined />
              {employee.department?.name || '-'}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="职位">
            {employee.position_id || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="入职日期">
            <Space>
              <CalendarOutlined />
              {formatDate(employee.hire_date)}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="试用期结束日期">
            <Space>
              <CalendarOutlined />
              {formatDate(employee.probation_end_date)}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="雇佣类型">
            {getEmploymentTypeText(employee.employment_type)}
          </Descriptions.Item>
          <Descriptions.Item label="工作地点">
            <Space>
              <EnvironmentOutlined />
              {employee.work_location || '-'}
            </Space>
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        {/* Emergency Contact */}
        <Descriptions
          title="紧急联系人"
          bordered
          column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
          labelStyle={{ fontWeight: 500, width: '150px' }}
        >
          <Descriptions.Item label="紧急联系人">
            <Space>
              <ContactsOutlined />
              {employee.emergency_contact || '-'}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="紧急联系电话">
            <Space>
              <PhoneOutlined />
              {employee.emergency_phone || '-'}
            </Space>
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        {/* Additional Information */}
        <Descriptions
          title="其他信息"
          bordered
          column={1}
          labelStyle={{ fontWeight: 500, width: '150px' }}
        >
          <Descriptions.Item label="钉钉用户ID">
            {employee.dingtalk_user_id || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="备注">
            {employee.remarks || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {formatDate(employee.created_at)}
          </Descriptions.Item>
          <Descriptions.Item label="最后更新时间">
            {formatDate(employee.updated_at)}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default EmployeeDetail;
