/**
 * Annual Leave List Page - Display and manage annual leave records
 */
import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Card,
  Upload,
  App,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
  DownloadOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const { Search } = Input;
const { Option } = Select;

interface AnnualLeave {
  leave_id: string;
  employee_id: string;
  employee_name: string;
  employee_number: string;
  year: number;
  total_days: number;
  used_days: number;
  remaining_days: number;
  carry_over_days?: number;
  expiry_date?: string;
  notes?: string;
}

const AnnualLeaveList: React.FC = () => {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();

  const [data, setData] = useState<AnnualLeave[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [queryParams, setQueryParams] = useState({
    page: 1,
    size: 10,
    keyword: '',
    year: new Date().getFullYear(),
  });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/annual-leave', { params: queryParams });
      if (response.data.success) {
        setData(response.data.data.items || []);
        setTotal(response.data.data.total || 0);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '获取年假数据失败');
    } finally {
      setLoading(false);
    }
  }, [queryParams, message]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (keyword: string) => {
    setQueryParams({ ...queryParams, keyword, page: 1 });
  };

  const handleYearFilter = (year: number) => {
    setQueryParams({ ...queryParams, year, page: 1 });
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/annual-leave/template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = '年假导入模板.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('模板下载成功');
    } catch (error: any) {
      message.error(error.response?.data?.message || '下载模板失败');
    }
  };

  const handleImport = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const hideLoading = message.loading('正在导入年假数据，请稍候...', 0);
    try {
      const response = await api.post('/annual-leave/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      hideLoading();

      if (response.data.success) {
        const { success_count, error_count, errors } = response.data.data;

        if (error_count > 0) {
          modal.warning({
            title: '导入完成',
            width: 600,
            content: (
              <div>
                <p>成功导入：{success_count} 条</p>
                <p>失败：{error_count} 条</p>
                {errors && errors.length > 0 && (
                  <div style={{ maxHeight: '300px', overflow: 'auto', marginTop: '10px' }}>
                    <p><strong>错误详情：</strong></p>
                    <ul style={{ fontSize: '12px' }}>
                      {errors.slice(0, 10).map((err: any, index: number) => (
                        <li key={index}>第 {err.row} 行: {err.message}</li>
                      ))}
                      {errors.length > 10 && <li>还有 {errors.length - 10} 条错误...</li>}
                    </ul>
                  </div>
                )}
              </div>
            ),
          });
        } else {
          message.success(`导入完成：成功 ${success_count} 条`);
        }
        fetchData();
      }
    } catch (error: any) {
      hideLoading();
      message.error(error.response?.data?.message || '导入年假数据失败');
    }
    return false;
  };

  const handleExport = async () => {
    const hideLoading = message.loading('正在导出年假数据，请稍候...', 0);
    try {
      const response = await api.get('/annual-leave/export', {
        params: queryParams,
        responseType: 'blob',
      });
      hideLoading();

      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `年假记录_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('年假数据导出成功');
    } catch (error: any) {
      hideLoading();
      message.error(error.response?.data?.message || '导出年假数据失败');
    }
  };

  const columns: ColumnsType<AnnualLeave> = [
    {
      title: '员工编号',
      dataIndex: 'employee_number',
      key: 'employee_number',
      width: 120,
    },
    {
      title: '姓名',
      dataIndex: 'employee_name',
      key: 'employee_name',
      width: 100,
    },
    {
      title: '年度',
      dataIndex: 'year',
      key: 'year',
      width: 80,
    },
    {
      title: '应休天数',
      dataIndex: 'total_days',
      key: 'total_days',
      width: 100,
      render: (days: number) => `${days} 天`,
    },
    {
      title: '已休天数',
      dataIndex: 'used_days',
      key: 'used_days',
      width: 100,
      render: (days: number) => `${days} 天`,
    },
    {
      title: '剩余天数',
      dataIndex: 'remaining_days',
      key: 'remaining_days',
      width: 100,
      render: (days: number) => {
        const color = days > 5 ? 'green' : days > 0 ? 'orange' : 'red';
        return <Tag color={color}>{days} 天</Tag>;
      },
    },
    {
      title: '结转天数',
      dataIndex: 'carry_over_days',
      key: 'carry_over_days',
      width: 100,
      render: (days?: number) => days ? `${days} 天` : '-',
    },
    {
      title: '过期日期',
      dataIndex: 'expiry_date',
      key: 'expiry_date',
      width: 120,
      render: (date?: string) => date || '-',
    },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space size="middle" wrap>
          <Search
            placeholder="按员工编号或姓名搜索"
            allowClear
            enterButton={<SearchOutlined />}
            onSearch={handleSearch}
            style={{ width: 300 }}
          />

          <Select
            placeholder="选择年度"
            value={queryParams.year}
            style={{ width: 150 }}
            onChange={handleYearFilter}
          >
            {years.map(year => (
              <Option key={year} value={year}>{year}年</Option>
            ))}
          </Select>
        </Space>
      </Card>

      <Card
        extra={
          <Space size="middle">
            <Button
              icon={<FileTextOutlined />}
              onClick={handleDownloadTemplate}
            >
              下载模板
            </Button>

            <Upload
              beforeUpload={handleImport}
              accept=".xlsx,.xls"
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>导入 Excel</Button>
            </Upload>

            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              导出 Excel
            </Button>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/annual-leave/new')}
            >
              添加记录
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={data}
          rowKey="leave_id"
          loading={loading}
          pagination={{
            current: queryParams.page,
            pageSize: queryParams.size,
            total: total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (page, size) => {
              setQueryParams({ ...queryParams, page, size });
            },
          }}
        />
      </Card>
    </div>
  );
};

export default AnnualLeaveList;
