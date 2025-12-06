/**
 * Social Security List Page - Display and manage social security records
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
  Modal,
  App,
  Tag,
  DatePicker,
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
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;

interface SocialSecurity {
  security_id: string;
  employee_id: string;
  employee_name: string;
  employee_number: string;
  year_month: string;
  social_security_base: number;
  housing_fund_base: number;
  total_personal: number;
  total_company: number;
  payment_status: string;
  payment_date?: string;
}

const SocialSecurityList: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [data, setData] = useState<SocialSecurity[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [queryParams, setQueryParams] = useState({
    page: 1,
    size: 10,
    keyword: '',
    year_month: dayjs().format('YYYY-MM'),
  });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/social-security', { params: queryParams });
      if (response.data.success) {
        setData(response.data.data.items || []);
        setTotal(response.data.data.total || 0);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '获取社保数据失败');
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

  const handleMonthChange = (date: any) => {
    if (date) {
      setQueryParams({ ...queryParams, year_month: date.format('YYYY-MM'), page: 1 });
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/social-security/template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = '社保公积金导入模板.xlsx';
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

    const hideLoading = message.loading('正在导入社保数据，请稍候...', 0);
    try {
      const response = await api.post('/social-security/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      hideLoading();

      if (response.data.success) {
        const { success_count, error_count, errors } = response.data.data;

        if (error_count > 0) {
          Modal.warning({
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
      message.error(error.response?.data?.message || '导入社保数据失败');
    }
    return false;
  };

  const handleExport = async () => {
    const hideLoading = message.loading('正在导出社保数据，请稍候...', 0);
    try {
      const response = await api.get('/social-security/export', {
        params: queryParams,
        responseType: 'blob',
      });
      hideLoading();

      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `社保公积金_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('社保数据导出成功');
    } catch (error: any) {
      hideLoading();
      message.error(error.response?.data?.message || '导出社保数据失败');
    }
  };

  const getStatusText = (status: string) => {
    const map: { [key: string]: string } = {
      pending: '待缴纳',
      paid: '已缴纳',
      failed: '缴纳失败',
    };
    return map[status] || status;
  };

  const getStatusColor = (status: string) => {
    const map: { [key: string]: string } = {
      pending: 'orange',
      paid: 'green',
      failed: 'red',
    };
    return map[status] || 'default';
  };

  const columns: ColumnsType<SocialSecurity> = [
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
      title: '年月',
      dataIndex: 'year_month',
      key: 'year_month',
      width: 100,
    },
    {
      title: '社保基数',
      dataIndex: 'social_security_base',
      key: 'social_security_base',
      width: 120,
      render: (amount: number) => `¥${amount.toFixed(2)}`,
    },
    {
      title: '公积金基数',
      dataIndex: 'housing_fund_base',
      key: 'housing_fund_base',
      width: 120,
      render: (amount: number) => `¥${amount.toFixed(2)}`,
    },
    {
      title: '个人合计',
      dataIndex: 'total_personal',
      key: 'total_personal',
      width: 120,
      render: (amount: number) => `¥${amount.toFixed(2)}`,
    },
    {
      title: '公司合计',
      dataIndex: 'total_company',
      key: 'total_company',
      width: 120,
      render: (amount: number) => `¥${amount.toFixed(2)}`,
    },
    {
      title: '缴纳状态',
      dataIndex: 'payment_status',
      key: 'payment_status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: '缴纳日期',
      dataIndex: 'payment_date',
      key: 'payment_date',
      width: 120,
      render: (date?: string) => date || '-',
    },
  ];

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

          <DatePicker
            picker="month"
            value={dayjs(queryParams.year_month, 'YYYY-MM')}
            onChange={handleMonthChange}
            format="YYYY-MM"
            placeholder="选择月份"
          />
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
              onClick={() => navigate('/social-security/new')}
            >
              添加记录
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={data}
          rowKey="security_id"
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

export default SocialSecurityList;
