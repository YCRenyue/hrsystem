/**
 * Offboard button - marks an employee as resigned (never deletes the record)
 */
import React, { useState } from "react";
import { App, Button, DatePicker, Form, Modal, Typography } from "antd";
import { LogoutOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { employeeService } from "../../services/employeeService";

interface OffboardButtonProps {
  employeeId: string;
  employeeName: string;
  onDone: () => void;
}

/**
 * Button + confirm dialog for HR to offboard an employee with a leave date
 */
const OffboardButton: React.FC<OffboardButtonProps> = ({
  employeeId,
  employeeName,
  onDone,
}) => {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaveDate, setLeaveDate] = useState<Dayjs | null>(dayjs());

  const handleOk = async (): Promise<void> => {
    if (!leaveDate) {
      message.warning("请选择离职日期");
      return;
    }
    setSubmitting(true);
    try {
      await employeeService.offboardEmployee(employeeId, leaveDate.format("YYYY-MM-DD"));
      message.success("已办理离职，该员工的登录账号已停用");
      setOpen(false);
      onDone();
    } catch (error: any) {
      message.error(error.response?.data?.message || "办理离职失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button danger icon={<LogoutOutlined />} onClick={() => setOpen(true)}>
        办理离职
      </Button>
      <Modal
        title={`办理离职：${employeeName}`}
        open={open}
        onOk={handleOk}
        onCancel={() => setOpen(false)}
        okText="确认离职"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: submitting }}
        destroyOnClose
      >
        <Typography.Paragraph type="secondary">
          员工记录会保留并标记为离职，同时停用其登录账号、结算当年年假。
        </Typography.Paragraph>
        <Form layout="vertical">
          <Form.Item label="离职日期" required>
            <DatePicker
              value={leaveDate}
              onChange={setLeaveDate}
              style={{ width: "100%" }}
              allowClear={false}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default OffboardButton;
