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
  Card,
  App,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Department } from '../../types';
import { departmentService } from '../../services/departmentService';

interface DepartmentWithCount extends Department {
  employee_count?: number;
}

const DepartmentList: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [departments, setDepartments] = useState<DepartmentWithCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);

  const fetchDepartments = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await departmentService.getDepartments();
      setDepartments(data);
    } catch (error) {
      message.error('获取部门列表失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleAdd = () => {
    setEditingDepartment(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    form.setFieldsValue({
      name: department.name,
      code: department.code,
      description: department.description,
    });
    setModalVisible(true);
  };

  const handleDelete = (departmentId: string) => {
    Modal.confirm({
      title: '确定要删除此部门吗？',
      content: '此操作无法撤销。',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await departmentService.deleteDepartment(departmentId);
          message.success('部门删除成功');
          fetchDepartments();
        } catch (error) {
          message.error('删除部门失败');
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
        message.success('部门更新成功');
      } else {
        await departmentService.createDepartment(values);
        message.success('部门创建成功');
      }

      setModalVisible(false);
      fetchDepartments();
    } catch (error) {
      message.error('保存部门失败');
    }
  };

  const columns: ColumnsType<DepartmentWithCount> = [
    {
      title: '部门名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '部门编码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '部门人数',
      dataIndex: 'employee_count',
      key: 'employee_count',
      width: 100,
      render: (count: number | undefined) => count !== undefined ? count : '-',
    },
    {
      title: '部门描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.department_id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="部门管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加部门
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={departments}
          rowKey="department_id"
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个部门`,
            pageSizeOptions: ['10', '20', '50'],
          }}
        />
      </Card>

      <Modal
        title={editingDepartment ? '编辑部门' : '添加部门'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText={editingDepartment ? '更新' : '创建'}
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="部门名称"
            name="name"
            rules={[{ required: true, message: '请输入部门名称！' }]}
          >
            <Input placeholder="例如：技术部、人力资源部、销售部" />
          </Form.Item>
          <Form.Item
            label="部门编码"
            name="code"
            rules={[{ required: true, message: '请输入部门编码！' }]}
          >
            <Input placeholder="例如：TECH、HR、SALES" />
          </Form.Item>
          <Form.Item
            label="部门描述"
            name="description"
          >
            <Input.TextArea
              rows={3}
              placeholder="请输入部门职责描述"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DepartmentList;
