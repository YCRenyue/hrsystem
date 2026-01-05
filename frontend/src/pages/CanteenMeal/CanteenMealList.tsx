/**
 * Canteen Meal Records List Page
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

interface CanteenMeal {
  meal_id: string;
  employee_id: string;
  employee_name: string;
  employee_number: string;
  meal_date: string;
  meal_type: string;
  location: string;
  amount: number;
  subsidy_amount: number;
  is_subsidized: boolean;
}

const CanteenMealList: React.FC = () => {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();

  const [data, setData] = useState<CanteenMeal[]>([]);
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
      const response = await api.get('/canteen-meals', { params: queryParams });
      if (response.data.success) {
        // API returns { data: [...], pagination: { total, ... } }
        const records = response.data.data || [];
        // Map employee info to flat structure for table display
        const mappedData = records.map((item: any) => ({
          ...item,
          employee_number: item.employee?.employee_number || item.employee_number,
          employee_name: item.employee?.name || item.employee_name,
        }));
        setData(mappedData);
        setTotal(response.data.pagination?.total || 0);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '获取就餐数据失败');
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
      const response = await api.get('/canteen-meals/template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = '就餐记录导入模板.xlsx';
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

    const hideLoading = message.loading('正在导入就餐数据，请稍候...', 0);
    try {
      const response = await api.post('/canteen-meals/import', formData, {
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
      message.error(error.response?.data?.message || '导入就餐数据失败');
    }
    return false;
  };

  const handleExport = async () => {
    const hideLoading = message.loading('正在导出就餐数据，请稍候...', 0);
    try {
      const response = await api.get('/canteen-meals/export', {
        params: queryParams,
        responseType: 'blob',
      });
      hideLoading();

      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `就餐记录_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('就餐数据导出成功');
    } catch (error: any) {
      hideLoading();
      message.error(error.response?.data?.message || '导出就餐数据失败');
    }
  };

  const getMealTypeText = (type: string) => {
    const map: { [key: string]: string } = {
      breakfast: '早餐',
      lunch: '午餐',
      dinner: '晚餐',
    };
    return map[type] || type;
  };

  const formatMoney = (amount?: number | string) => {
    const num = Number(amount)
    return Number.isFinite(num) ? `¥${num.toFixed(2)}` : '-'
  }

  const columns: ColumnsType<CanteenMeal> = [
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
      title: '就餐日期',
      dataIndex: 'meal_date',
      key: 'meal_date',
      width: 120,
    },
    {
      title: '餐次',
      dataIndex: 'meal_type',
      key: 'meal_type',
      width: 80,
      render: (type: string) => getMealTypeText(type),
    },
    {
      title: '就餐地点',
      dataIndex: 'location',
      key: 'location',
      width: 150,
    },
    {
      title: '餐费金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (amount?: number | string) => formatMoney(amount),
    },
    {
      title: '补贴金额',
      dataIndex: 'subsidy_amount',
      key: 'subsidy_amount',
      width: 100,
      render: (amount?: number | string) => formatMoney(amount),
    },
    {
      title: '是否补贴',
      dataIndex: 'is_subsidized',
      key: 'is_subsidized',
      width: 100,
      render: (subsidized: boolean) => (
        <Tag color={subsidized ? 'green' : 'default'}>
          {subsidized ? '是' : '否'}
        </Tag>
      ),
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
              onClick={() => navigate('/canteen-meals/new')}
            >
              添加记录
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={data}
          rowKey="meal_id"
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

export default CanteenMealList;
