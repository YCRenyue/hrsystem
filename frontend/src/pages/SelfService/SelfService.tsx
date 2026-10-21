/**
 * Employee self-service hub.
 */

import React from "react";
import { Card, Col, Row, Typography } from "antd";
import {
  CalendarOutlined,
  CarOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Title, Paragraph } = Typography;

const SelfService: React.FC = () => {
  const navigate = useNavigate();
  const items = [
    { title: "个人资料", description: "查看和维护个人联系信息", path: "/profile", icon: <UserOutlined /> },
    { title: "请假申请", description: "提交请假并查看审批进度", path: "/leaves", icon: <FileTextOutlined /> },
    { title: "我的年假", description: "查看年度额度和剩余天数", path: "/annual-leave", icon: <CalendarOutlined /> },
    { title: "出差申请", description: "发起出差并查看行程状态", path: "/business-trips", icon: <CarOutlined /> },
    { title: "差旅报销", description: "提交费用明细并跟踪发放", path: "/reimbursements", icon: <WalletOutlined /> },
    {
      title: "制度确认",
      description: "阅读并签署公司制度文件",
      path: "/document-confirmations/my",
      icon: <FileProtectOutlined />,
    },
  ];

  return (
    <div>
      <Title level={3}>员工自助服务</Title>
      <Paragraph type="secondary">集中办理个人信息、请假、出差和报销事项。</Paragraph>
      <Row gutter={[16, 16]}>
        {items.map((item) => (
          <Col xs={24} sm={12} lg={8} key={item.path}>
            <Card hoverable onClick={() => navigate(item.path)}>
              <Card.Meta
                avatar={<span style={{ fontSize: 28, color: "#1677ff" }}>{item.icon}</span>}
                title={item.title}
                description={item.description}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default SelfService;
