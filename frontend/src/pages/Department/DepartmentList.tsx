/**
 * Department List Page - Department management
 */
import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Card,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Department } from '../../types';
import { departmentService } from '../../services/departmentService';

const DepartmentList: React.FC = () => {
  const [form] = Form.useForm();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const data = await departmentService.getDepartments();
      setDepartments(data);
    } catch (error) {
      message.error('Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingDepartment(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    form.setFieldsValue({
      department_name: department.department_name,
    });
    setModalVisible(true);
  };

  const handleDelete = (departmentId: string) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this department?',
      content: 'This action cannot be undone.',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await departmentService.deleteDepartment(departmentId);
          message.success('Department deleted successfully');
          fetchDepartments();
        } catch (error) {
          message.error('Failed to delete department');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingDepartment) {
        await departmentService.updateDepartment(
          editingDepartment.department_id,
          values
        );
        message.success('Department updated successfully');
      } else {
        await departmentService.createDepartment(values);
        message.success('Department created successfully');
      }

      setModalVisible(false);
      fetchDepartments();
    } catch (error) {
      message.error('Failed to save department');
    }
  };

  const columns: ColumnsType<Department> = [
    {
      title: 'Department Name',
      dataIndex: 'department_name',
      key: 'department_name',
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.department_id)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="Department Management"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Department
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={departments}
          rowKey="department_id"
          loading={loading}
        />
      </Card>

      <Modal
        title={editingDepartment ? 'Edit Department' : 'Add Department'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText={editingDepartment ? 'Update' : 'Create'}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Department Name"
            name="department_name"
            rules={[{ required: true, message: 'Please input department name!' }]}
          >
            <Input placeholder="e.g., Engineering, HR, Sales" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DepartmentList;
