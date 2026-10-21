/**
 * PunchImportResultModal - 考勤/食堂打卡导入结果
 *
 * 展示写入统计、需要 HR 处理的事项（未匹配人员、待复核刷卡、机器汇总提醒等）。
 */

import React from 'react';
import { Alert, Descriptions, Modal, Typography } from 'antd';
import {
  AttendanceImportResult,
  CanteenImportResult,
  PunchDeviceType,
  PunchImportResultBase,
} from '../../services/punchService';
import PunchUnmatchedTable from './PunchUnmatchedTable';

interface Props {
  deviceType: PunchDeviceType;
  result: PunchImportResultBase | null;
  onClose: () => void;
}

const { Text } = Typography;

type StatItem = { key: string; label: string; children: React.ReactNode };

/**
 * 两种导入各自的写入统计
 */
const buildStatItems = (deviceType: PunchDeviceType, result: PunchImportResultBase): StatItem[] => {
  if (deviceType === 'canteen') {
    const r = result as CanteenImportResult;
    return [
      {
        key: 'meals',
        label: '用餐记录',
        children: `新增 ${r.meals_created} / 更新 ${r.meals_updated} / 删除 ${r.meals_removed}`,
      },
      { key: 'merged', label: '重复刷卡合并', children: `${r.duplicates_merged} 次` },
      { key: 'anomalies', label: '待复核刷卡', children: `${r.anomalies_count} 条` },
    ];
  }
  const r = result as AttendanceImportResult;
  return [
    { key: 'daily', label: '每日考勤', children: `新增 ${r.daily_created} / 更新 ${r.daily_updated}` },
    {
      key: 'summary',
      label: '周期汇总',
      children: `新增 ${r.summaries_created} / 更新 ${r.summaries_updated}`,
    },
  ];
};

const AttendanceNotices: React.FC<{ result: AttendanceImportResult }> = ({ result }) => (
  <>
    {result.skipped_dates.length > 0 && (
      <Alert
        type="info"
        showIcon
        style={{ marginTop: 12 }}
        message={`导出当天数据不完整，未导入：${result.skipped_dates.join('、')}，下次导入包含这些日期的文件时会补上`}
      />
    )}
    {result.summary_warnings.length > 0 && (
      <Alert
        type="warning"
        showIcon
        style={{ marginTop: 12 }}
        message="以下员工的打卡机汇总旷工天数明显多于实际无打卡的工作日，请核对打卡机班次设置"
        description={result.summary_warnings
          .map((w) => `${w.name}：机器记旷工 ${w.machine_absent_days} 天，实际无打卡 ${w.workdays_without_punch} 天`)
          .join('；')}
      />
    )}
  </>
);

const PunchImportResultModal: React.FC<Props> = ({ deviceType, result, onClose }) => {
  if (!result) return null;
  const needMapping = [...result.ambiguous, ...result.unmatched];
  const canteen = deviceType === 'canteen' ? (result as CanteenImportResult) : null;
  const attendance = deviceType === 'attendance' ? (result as AttendanceImportResult) : null;

  return (
    <Modal
      open
      title={deviceType === 'canteen' ? '食堂打卡导入完成' : '考勤打卡导入完成'}
      width={860}
      onCancel={onClose}
      onOk={onClose}
      cancelButtonProps={{ style: { display: 'none' } }}
    >
      <Descriptions
        size="small"
        column={2}
        bordered
        items={[
          { key: 'period', label: '统计周期', children: result.period },
          {
            key: 'matched',
            label: '匹配员工',
            children: `${result.matched} / ${result.employees_total} 人`,
          },
          ...buildStatItems(deviceType, result),
          { key: 'manual', label: '保留手工记录', children: `${result.manual_kept} 条` },
        ]}
      />

      {attendance && <AttendanceNotices result={attendance} />}
      {canteen && canteen.anomalies_count > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginTop: 12 }}
          message={`有 ${canteen.anomalies_count} 条刷卡不在饭点、在非工作日或在请假/出差期间，未计入用餐，请在「待复核刷卡」中处理`}
        />
      )}
      {result.punches_after_leave.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginTop: 12 }}
          message="以下员工在离职日期之后仍有打卡，请复核"
          description={result.punches_after_leave
            .map((p) => `${p.name}（离职 ${p.leave_date}）：${p.dates.join('、')}`)
            .join('；')}
        />
      )}
      {needMapping.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Text strong>
            以下打卡人员未导入（{needMapping.length} 人），可为其指定对应员工，重新导入后生效：
          </Text>
          <PunchUnmatchedTable deviceType={deviceType} rows={needMapping} />
        </div>
      )}
    </Modal>
  );
};

export default PunchImportResultModal;
