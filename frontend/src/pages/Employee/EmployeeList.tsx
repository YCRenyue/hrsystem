/**
 * Employee List Page - Display and manage employees
 */
import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Modal,
  message,
  Upload,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { Employee, EmploymentStatus, EmployeeQueryParams } from '../../types';
import { employeeService } from '../../services/employeeService';
import './EmployeeList.css';

const { Search } = Input;
const { Option } = Select;

const EmployeeList: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [queryParams, setQueryParams] = useState<EmployeeQueryParams>({
    page: 1,
    size: 10,
  });

  useEffect(() => {
    fetchEmployees();
  }, [queryParams]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await employeeService.getEmployees(queryParams);
      setEmployees(response.items);
      setTotal(response.total);
    } catch (error) {
      message.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (keyword: string) => {
    setQueryParams({ ...queryParams, keyword, page: 1 });
  };

  const handleStatusFilter = (status: EmploymentStatus | undefined) => {
    setQueryParams({ ...queryParams, employment_status: status, page: 1 });
  };

  const handlePageChange = (page: number, size: number) => {
    setQueryParams({ ...queryParams, page, size });
  };

  const handleDelete = (employeeId: string) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this employee?',
      content: 'This action cannot be undone.',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await employeeService.deleteEmployee(employeeId);
          message.success('Employee deleted successfully');
          fetchEmployees();
        } catch (error) {
          message.error('Failed to delete employee');
        }
      },
    });
  };

  const handleImport = async (file: File) => {
    try {
      const result = await employeeService.importFromExcel(file);
      message.success(`Import completed: ${result.data?.success_count} succeeded`);
      fetchEmployees();
    } catch (error) {
      message.error('Failed to import employees');
    }
    return false; // Prevent default upload behavior
  };

  const handleExport = async () => {
    try {
      const blob = await employeeService.exportToExcel(queryParams);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employees_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error('Failed to export employees');
    }
  };

  const getStatusColor = (status: EmploymentStatus): string => {
    const colorMap: Record<EmploymentStatus, string> = {
      pending: 'orange',
      probation: 'blue',
      regular: 'green',
      resigned: 'red',
      terminated: 'red',
    };
    return colorMap[status] || 'default';
  };

  const columns: ColumnsType<Employee> = [
    {
      title: 'Employee #',
      dataIndex: 'employee_number',
      key: 'employee_number',
      width: 120,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
    },
    {
      title: 'Department',
      dataIndex: ['department', 'department_name'],
      key: 'department',
      width: 150,
    },
    {
      title: 'Status',
      dataIndex: 'employment_status',
      key: 'employment_status',
      width: 120,
      render: (status: EmploymentStatus) => (
        <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Hire Date',
      dataIndex: 'hire_date',
      key: 'hire_date',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/employees/${record.employee_id}/edit`)}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.employee_id)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="employee-list-container">
      <div className="employee-list-header">
        <Space size="middle" wrap>
          <Search
            placeholder="Search by name, email, or employee number"
            allowClear
            enterButton={<SearchOutlined />}
            onSearch={handleSearch}
            style={{ width: 300 }}
          />
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 150 }}
            onChange={handleStatusFilter}
          >
            <Option value="pending">Pending</Option>
            <Option value="probation">Probation</Option>
            <Option value="regular">Regular</Option>
            <Option value="resigned">Resigned</Option>
            <Option value="terminated">Terminated</Option>
          </Select>
        </Space>
        <Space size="middle">
          <Upload beforeUpload={handleImport} accept=".xlsx,.xls" showUploadList={false}>
            <Button icon={<UploadOutlined />}>Import Excel</Button>
          </Upload>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            Export Excel
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/employees/new')}
          >
            Add Employee
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={employees}
        rowKey="employee_id"
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{
          current: queryParams.page,
          pageSize: queryParams.size,
          total: total,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} employees`,
          onChange: handlePageChange,
        }}
      />
    </div>
  );
};

export default EmployeeList;
