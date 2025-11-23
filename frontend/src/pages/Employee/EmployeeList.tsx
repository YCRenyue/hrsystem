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
  Upload,
  DatePicker,
  Card,
  App,
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
import { Dayjs } from 'dayjs';
import './EmployeeList.css';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const EmployeeList: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [queryParams, setQueryParams] = useState<EmployeeQueryParams>({
    page: 1,
    size: 10,
  });

  const fetchDepartments = React.useCallback(async () => {
    try {
      const data = await departmentService.getDepartments();
      setDepartments(data);
    } catch (error) {
      message.error('获取部门列表失败');
    }
  }, [message]);

  const fetchEmployees = React.useCallback(async () => {
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
  }, [queryParams, message]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

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

  const handleTableChange = (pagination: any, _filters: any, sorter: any) => {
    const { current, pageSize } = pagination;

    // Handle sorting
    let sortBy: string = 'employee_number';
    let sortOrder: 'ASC' | 'DESC' = 'ASC';

    if (sorter && sorter.field) {
      // Map frontend field names to backend field names
      const fieldMap: Record<string, string> = {
        employee_number: 'employee_number',
        name: 'name',
        department: 'department',
        status: 'status',
        entry_date: 'entry_date',
      };

      sortBy = fieldMap[sorter.field as string] || 'employee_number';
      sortOrder = sorter.order === 'descend' ? 'DESC' : 'ASC';
    }

    setQueryParams({
      ...queryParams,
      page: current,
      size: pageSize,
      sort_by: sortBy,
      sort_order: sortOrder,
    });
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
    const hideLoading = message.loading('正在导入员工数据，请稍候...', 0);
    try {
      const result = await employeeService.importFromExcel(file);
      hideLoading();

      const successCount = result.data?.success_count || 0;
      const errorCount = result.data?.error_count || 0;
      const errors = result.data?.errors || [];

      if (errorCount > 0) {
        // Show detailed error information
        Modal.warning({
          title: '导入完成',
          width: 600,
          content: (
            <div>·
              <p>成功导入：{successCount} 条</p>
              <p>失败：{errorCount} 条</p>
              {errors.length > 0 && (
                <div style={{ maxHeight: '300px', overflow: 'auto', marginTop: '10px' }}>
                  <p><strong>错误详情：</strong></p>
                  <ul style={{ fontSize: '12px' }}>
                    {errors.slice(0, 10).map((err: any, index: number) => (
                      <li key={index}>
                        第 {err.row} 行: {err.message}
                      </li>
                    ))}
                    {errors.length > 10 && <li>还有 {errors.length - 10} 条错误...</li>}
                  </ul>
                </div>
              )}
            </div>
          ),
        });
      } else {
        message.success(`导入完成：成功 ${successCount} 条`);
      }

      fetchEmployees();
    } catch (error: any) {
      hideLoading();
      const errorMsg = error?.response?.data?.message || error?.message || '导入员工数据失败';
      message.error(errorMsg);
      console.error('Import error:', error);
    }
    return false; // Prevent default upload behavior
  };

  const handleExport = async () => {
    const hideLoading = message.loading('正在导出员工数据，请稍候...', 0);
    try {
      const blob = await employeeService.exportToExcel(queryParams);
      hideLoading();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `员工列表_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('员工数据导出成功');
    } catch (error: any) {
      hideLoading();
      const errorMsg = error?.response?.data?.message || error?.message || '导出员工数据失败';
      message.error(errorMsg);
      console.error('Export error:', error);
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

  const getStatusText = (status: string): string => {
    const statusMap: Record<string, string> = {
      pending: '待完善',
      active: '在职',
      inactive: '离职',
      probation: '试用期',
      regular: '正式',
      resigned: '已离职',
      terminated: '已终止',
    };
    return statusMap[status] || status;
  };

  const columns: ColumnsType<Employee> = [
    {
      title: '员工编号',
      dataIndex: 'employee_number',
      key: 'employee_number',
      width: 120,
      defaultSortOrder: 'ascend',
      sorter: true, // Use server-side sorting
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      sorter: true, // Use server-side sorting
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
      sorter: true, // Use server-side sorting
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      sorter: true, // Use server-side sorting
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          pending: 'orange',
          active: 'green',
          inactive: 'red',
          probation: 'blue',
          regular: 'green',
          resigned: 'red',
          terminated: 'red',
        };
        return <Tag color={colorMap[status] || 'default'}>{getStatusText(status)}</Tag>;
      },
    },
    {
      title: '入职日期',
      dataIndex: 'entry_date',
      key: 'entry_date',
      width: 120,
      sorter: true, // Use server-side sorting
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
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
          onChange={handleTableChange}
          pagination={{
            current: queryParams.page,
            pageSize: queryParams.size,
            total: total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 名员工`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
        />
      </Card>
    </div>
  );
};

export default EmployeeList;
