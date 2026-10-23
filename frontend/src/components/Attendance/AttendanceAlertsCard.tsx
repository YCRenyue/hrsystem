/**
 * AttendanceAlertsCard - 考勤提醒
 *
 * 列出两类需要 HR 处理的情况：
 *  - 考勤异常：已请假但当天有打卡
 *  - 旷工提醒：未请假且工作日没有打卡
 */

import React from "react";
import { Card, Table, Tag } from "antd";
import { AttendanceSummaryRow } from "../../services/attendanceService";

interface AlertItem {
  key: string;
  name: string;
  period: string;
  kind: "leave_punch" | "absent";
  dates: string[];
}

interface Props {
  rows: AttendanceSummaryRow[];
  loading: boolean;
}

/**
 * 把报表行展开成每人每类一条提醒
 */
const buildAlerts = (rows: AttendanceSummaryRow[]): AlertItem[] =>
  rows.flatMap((r) => {
    const base = {
      name: r.employee?.name || r.employee?.employee_number || "-",
      period: `${r.period_start} ~ ${r.period_end}`,
    };
    const items: AlertItem[] = [];
    if (r.leave_punch_dates?.length) {
      items.push({
        ...base,
        key: `${r.summary_id}-leave`,
        kind: "leave_punch",
        dates: r.leave_punch_dates,
      });
    }
    if (r.absent_dates?.length) {
      items.push({ ...base, key: `${r.summary_id}-absent`, kind: "absent", dates: r.absent_dates });
    }
    return items;
  });

const AttendanceAlertsCard: React.FC<Props> = ({ rows, loading }) => {
  const alerts = buildAlerts(rows);
  if (!loading && alerts.length === 0) return null;
  return (
    <Card title="考勤提醒" style={{ marginBottom: 16 }}>
      <Table<AlertItem>
        size="small"
        rowKey="key"
        loading={loading}
        dataSource={alerts}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: "姓名", dataIndex: "name", width: 120 },
          { title: "统计周期", dataIndex: "period", width: 200 },
          {
            title: "类型",
            dataIndex: "kind",
            width: 200,
            render: (kind: AlertItem["kind"]) => (kind === "leave_punch"
              ? <Tag color="red">异常：已请假但当天有打卡</Tag>
              : <Tag color="orange">旷工：未请假也未打卡</Tag>),
          },
          { title: "日期", dataIndex: "dates", render: (dates: string[]) => dates.join("、") },
        ]}
      />
    </Card>
  );
};

export default AttendanceAlertsCard;
