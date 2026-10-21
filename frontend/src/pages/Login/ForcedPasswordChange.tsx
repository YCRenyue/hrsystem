/**
 * Forced password change page for initial or expired passwords.
 */
import React, { useState } from "react";
import { App, Button, Card, Form, Input } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { userService } from "../../services/userService";
import "./Login.css";

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ForcedPasswordChange: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const handleSubmit = async (values: PasswordFormValues) => {
    setSubmitting(true);
    try {
      await userService.changePassword(values);
      message.success("密码修改成功，请使用新密码重新登录");
      await logout();
      navigate("/login", { replace: true });
    } catch (error: any) {
      message.error(error.response?.data?.message || "密码修改失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card" title="首次登录，请修改密码">
        <Form<PasswordFormValues>
          layout="vertical"
          onFinish={handleSubmit}
          size="large"
        >
          <Form.Item
            label="当前密码"
            name="currentPassword"
            rules={[{ required: true, message: "请输入当前密码" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              autoComplete="current-password"
            />
          </Form.Item>
          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: "请输入新密码" },
              { min: 8, message: "密码至少8个字符" },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
                message: "密码必须包含大小写字母和数字",
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              autoComplete="new-password"
            />
          </Form.Item>
          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "请再次输入新密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的密码不一致"));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              autoComplete="new-password"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            修改密码
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default ForcedPasswordChange;
