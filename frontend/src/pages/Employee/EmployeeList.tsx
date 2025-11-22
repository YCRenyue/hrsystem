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
  DatePicker,
  Card,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { Employee, EmploymentStatus, EmployeeQueryParams, Department } from '../../types';
import { employeeService } from '../../services/employeeService';
import { departmentService } from '../../services/departmentService';
import dayjs, { Dayjs } from 'dayjs';
import './EmployeeList.css';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const EmployeeList: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [queryParams, setQueryParams] = useState<EmployeeQueryParams>({
    page: 1,
    size: 10,
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [queryParams]);

  const fetchDepartments = async () => {
    try {
      const data = await departmentService.getDepartments();
      setDepartments(data);
    } catch (error) {
      message.error('获取部门列表失败');
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await employeeService.getEmployees(queryParams);
      setEmployees(response.items);
      setTotal(response.total);
    } catch (error) {
      message.error('获取员工列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (keyword: string) => {
    setQueryParams({ ...queryParams, keyword, page: 1 });
  };

  const handleStatusFilter = (status: string | undefined) => {
    setQueryParams({ ...queryParams, status, page: 1 });
  };

  const handleDepartmentFilter = (department_id: string | undefined) => {
    setQueryParams({ ...queryParams, department_id, page: 1 });
  };

  const handleDateRangeFilter = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setQueryParams({
        ...queryParams,
        entry_date_start: dates[0].format('YYYY-MM-DD'),
        entry_date_end: dates[1].format('YYYY-MM-DD'),
        page: 1,
      });
    } else {
      const { entry_date_start, entry_date_end, ...rest } = queryParams;
      setQueryParams({ ...rest, page: 1 });
    }
  };

  const handlePageChange = (page: number, size: number) => {
    setQueryParams({ ...queryParams, page, size });
  };

  const handleDelete = (employeeId: string) => {
    Modal.confirm({
      title: '确定要删除此员工吗？',
      content: '此操作无法撤销。',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await employeeService.deleteEmployee(employeeId);
          message.success('员工删除成功');
          fetchEmployees();
        } catch (error) {
          message.error('删除员工失败');
        }
      },
    });
  };

  const handleImport = async (file: File) => {
    try {
      const result = await employeeService.importFromExcel(file);
      message.success(`导入完成：成功 ${result.data?.success_count} 条`);
      fetchEmployees();
    } catch (error) {
      message.error('导入员工数据失败');
    }
    return false; // Prevent default upload behavior
  };

  const handleExport = async () => {
    try {
      const blob = await employeeService.exportToExcel(queryParams);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `员工列表_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error('导出员工数据失败');
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
      title: '员工编号',
      dataIndex: 'employee_number',
      key: 'employee_number',
      width: 120,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
    },
    {
      title: '部门',
      dataIndex: ['department', 'name'],
      key: 'department',
      width: 150,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          pending: 'orange',
          active: 'green',
          inactive: 'red',
        };
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: '入职日期',
      dataIndex: 'entry_date',
      key: 'entry_date',
      width: 120,
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
    },
    {
      title: '操作',
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
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.employee_id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="employee-list-container">
      <Card className="employee-filter-card" title={<><FilterOutlined /> 筛选条件</>}>
        <Space size="middle" wrap style={{ width: '100%' }}>
          <Search
            placeholder="按姓名、邮箱或员工编号搜索"
            allowClear
            enterButton={<SearchOutlined />}
            onSearch={handleSearch}
            style={{ width: 300 }}
          />
          <Select
            placeholder="按部门筛选"
            allowClear
            style={{ width: 200 }}
            onChange={handleDepartmentFilter}
            showSearch
            optionFilterProp="children"
          >
            {departments.map(dept => (
              <Option key={dept.department_id} value={dept.department_id}>
                {dept.name}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="按状态筛选"
            allowClear
            style={{ width: 150 }}
            onChange={handleStatusFilter}
          >
            <Option value="pending">待完善</Option>
            <Option value="active">在职</Option>
            <Option value="inactive">离职</Option>
          </Select>
          <RangePicker
            placeholder={['入职开始日期', '入职结束日期']}
            format="YYYY-MM-DD"
            onChange={handleDateRangeFilter}
            style={{ width: 300 }}
          />
        </Space>
      </Card>

      <Card
        className="employee-actions-card"
        style={{ marginTop: 16 }}
        extra={
          <Space size="middle">
            <Upload beforeUpload={handleImport} accept=".xlsx,.xls" showUploadList={false}>
              <Button icon={<UploadOutlined />}>导入 Excel</Button>
            </Upload>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出 Excel
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/employees/new')}
            >
              添加员工
            </Button>
          </Space>
        }
      >

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
            showTotal: (total) => `共 ${total} 名员工`,
            onChange: handlePageChange,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
        />
      </Card>
    </div>
  );
};

export default EmployeeList;
