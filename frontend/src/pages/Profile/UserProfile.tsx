/**
 * User Profile Page
 * Displays and allows editing of current user's profile information
 */
import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Form, Input, message, Spin } from 'antd';
import { EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface UserProfileData {
  user: {
    username: string;
    email: string;
    role: string;
    display_name?: string;
  };
  employee?: {
    employee_number: string;
    name: string;
    phone: string;
    email: string;
    department?: {
      name: string;
    };
    position?: string;
    entry_date?: string;
    emergency_contact?: string;
    emergency_phone?: string;
    address?: string;
  };
}

const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users/profile');
      if (response.data.success) {
        setProfileData(response.data.data);
        form.setFieldsValue({
          email: response.data.data.employee?.email,
          emergency_contact: response.data.data.employee?.emergency_contact,
          emergency_phone: response.data.data.employee?.emergency_phone,
          address: response.data.data.employee?.address
        });
      }
    } catch (error) {
      message.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const response = await api.put('/users/profile', values);
      if (response.data.success) {
        message.success('Profile updated successfully');
        setEditing(false);
        fetchProfileData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    setEditing(false);
    form.resetFields();
  };

  if (loading) {
    return <Spin size="large" />;
  }

  if (!profileData) {
    return <div>No profile data available</div>;
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="User Profile"
        extra={
          !editing ? (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
          ) : (
            <>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                style={{ marginRight: 8 }}
              >
                Save
              </Button>
              <Button icon={<CloseOutlined />} onClick={handleCancel}>
                Cancel
              </Button>
            </>
          )
        }
      >
        {!editing ? (
          <>
            <Descriptions title="Account Information" bordered column={2}>
              <Descriptions.Item label="Username">
                {profileData.user.username}
              </Descriptions.Item>
              <Descriptions.Item label="Role">
                {profileData.user.role}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {profileData.user.email || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Display Name">
                {profileData.user.display_name || 'N/A'}
              </Descriptions.Item>
            </Descriptions>

            {profileData.employee && (
              <Descriptions
                title="Employee Information"
                bordered
                column={2}
                style={{ marginTop: 24 }}
              >
                <Descriptions.Item label="Employee Number">
                  {profileData.employee.employee_number}
                </Descriptions.Item>
                <Descriptions.Item label="Name">
                  {profileData.employee.name}
                </Descriptions.Item>
                <Descriptions.Item label="Department">
                  {profileData.employee.department?.name || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Position">
                  {profileData.employee.position || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Phone">
                  {profileData.employee.phone}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {profileData.employee.email}
                </Descriptions.Item>
                <Descriptions.Item label="Entry Date">
                  {profileData.employee.entry_date || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Emergency Contact">
                  {profileData.employee.emergency_contact || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Emergency Phone">
                  {profileData.employee.emergency_phone || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Address" span={2}>
                  {profileData.employee.address || 'N/A'}
                </Descriptions.Item>
              </Descriptions>
            )}
          </>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item
              name="email"
              label="Email"
              rules={[{ type: 'email', message: 'Invalid email format' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="emergency_contact" label="Emergency Contact">
              <Input />
            </Form.Item>
            <Form.Item name="emergency_phone" label="Emergency Phone">
              <Input />
            </Form.Item>
            <Form.Item name="address" label="Address">
              <Input.TextArea rows={3} />
            </Form.Item>
          </Form>
        )}
      </Card>
    </div>
  );
};

export default UserProfile;
