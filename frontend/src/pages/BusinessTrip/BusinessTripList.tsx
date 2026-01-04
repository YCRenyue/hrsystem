/**
 * Business Trip Allowance List Page
 */
import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
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

interface BusinessTrip {
  trip_id: string;
  employee_id: string;
  employee_name: string;
  employee_number: string;
  trip_number: string;
  start_date: string;
  end_date: string;
  destination: string;
  days: number;
  total_allowance: number;
  status: string;
}

const BusinessTripList: React.FC = () => {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();

  const [data, setData] = useState<BusinessTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [queryParams, setQueryParams] = useState({
    page: 1,
    size: 10,
    keyword: '',
  });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/business-trips', { params: queryParams });
      if (response.data.success) {
        setData(response.data.data.items || []);
        setTotal(response.data.data.total || 0);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '获取出差数据失败');
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

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/business-trips/template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = '出差补助导入模板.xlsx';
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

    const hideLoading = message.loading('正在导入出差数据，请稍候...', 0);
    try {
      const response = await api.post('/business-trips/import', formData, {
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
      message.error(error.response?.data?.message || '导入出差数据失败');
    }
    return false;
  };

  const handleExport = async () => {
    const hideLoading = message.loading('正在导出出差数据，请稍候...', 0);
    try {
      const response = await api.get('/business-trips/export', {
        params: queryParams,
        responseType: 'blob',
      });
      hideLoading();

      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `出差补助_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('出差数据导出成功');
    } catch (error: any) {
      hideLoading();
      message.error(error.response?.data?.message || '导出出差数据失败');
    }
  };

  const getStatusText = (status: string) => {
    const map: { [key: string]: string } = {
      draft: '草稿',
      pending: '待审批',
      approved: '已批准',
      rejected: '已拒绝',
      paid: '已支付',
    };
    return map[status] || status;
  };

  const getStatusColor = (status: string) => {
    const map: { [key: string]: string } = {
      draft: 'default',
      pending: 'orange',
      approved: 'blue',
      rejected: 'red',
      paid: 'green',
    };
    return map[status] || 'default';
  };

  const columns: ColumnsType<BusinessTrip> = [
    {
      title: '出差单号',
      dataIndex: 'trip_number',
      key: 'trip_number',
      width: 150,
    },
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
      title: '出差日期',
      key: 'trip_dates',
      width: 200,
      render: (_, record) => `${record.start_date} ~ ${record.end_date}`,
    },
    {
      title: '目的地',
      dataIndex: 'destination',
      key: 'destination',
      width: 150,
    },
    {
      title: '天数',
      dataIndex: 'days',
      key: 'days',
      width: 80,
      render: (days: number) => `${days} 天`,
    },
    {
      title: '补助合计',
      dataIndex: 'total_allowance',
      key: 'total_allowance',
      width: 120,
      render: (amount: number) => `¥${amount.toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space size="middle" wrap>
          <Search
            placeholder="按员工编号、姓名或出差单号搜索"
            allowClear
            enterButton={<SearchOutlined />}
            onSearch={handleSearch}
            style={{ width: 350 }}
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
              onClick={() => navigate('/business-trips/new')}
            >
              添加记录
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={data}
          rowKey="trip_id"
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

export default BusinessTripList;
