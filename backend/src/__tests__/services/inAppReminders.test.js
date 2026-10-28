/**
 * 站内铃铛提醒单元测试：待签署、考勤异常、出差缺水印打卡、出差结束未报销
 */

const inAppNotification = require('../../services/InAppNotificationService');
const approvalService = require('../../services/approvalService');
const { User, BusinessTrip } = require('../../models');
const { notifyDocumentToSign } = require('../../services/documentNotifier');
const { notifyAttendanceAlerts, _internal } = require('../../services/hrNotifier');
const tripReminderJobs = require('../../services/tripReminderJobs');

const { NotificationTypes } = inAppNotification;

afterEach(() => {
  jest.restoreAllMocks();
});

describe('notifyDocumentToSign', () => {
  test('sends a to-sign reminder linking to my documents', async () => {
    jest.spyOn(approvalService, 'findUserIdForEmployee').mockResolvedValue('user-1');
    jest.spyOn(inAppNotification, 'exists').mockResolvedValue(false);
    const send = jest.spyOn(inAppNotification, 'send').mockResolvedValue({});

    await notifyDocumentToSign({ employeeId: 'emp-1', documentType: 'training_pledge' });

    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0][0];
    expect(payload.recipientUserId).toBe('user-1');
    expect(payload.type).toBe(NotificationTypes.DOCUMENT_TO_SIGN);
    expect(payload.title).toBe('培训服务承诺函待签署');
    expect(payload.linkUrl).toBe('/document-confirmations/my');
  });

  test('skips when an unread reminder for the same document exists', async () => {
    jest.spyOn(inAppNotification, 'exists').mockResolvedValue(true);
    const send = jest.spyOn(inAppNotification, 'send').mockResolvedValue({});

    await notifyDocumentToSign({
      employeeId: 'emp-1', documentType: 'employment_contract', recipientUserId: 'user-1'
    });

    expect(inAppNotification.exists).toHaveBeenCalledWith(expect.objectContaining({
      relatedResource: 'employment_contract', unreadOnly: true
    }));
    expect(send).not.toHaveBeenCalled();
  });

  test('never throws when sending fails', async () => {
    jest.spyOn(inAppNotification, 'exists').mockRejectedValue(new Error('db down'));
    await expect(notifyDocumentToSign({
      employeeId: 'emp-1', documentType: 'policy_ack', recipientUserId: 'user-1'
    })).resolves.toBeUndefined();
  });
});

describe('notifyAttendanceAlerts', () => {
  const employee = (id, deptId, name) => ({
    employee_id: id, department_id: deptId, getName: () => name
  });

  test('describes absence and leave-with-punch dates', () => {
    expect(_internal.describeAlert({
      absentDates: ['2026-03-02', '2026-03-03'], leavePunchDates: ['2026-03-18']
    })).toEqual([
      '旷工（未请假也未打卡）：2026-03-02、2026-03-03',
      '已请假但当天有打卡：2026-03-18'
    ]);
  });

  test('one alert per employee and one summary per department manager', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue({ user_id: 'emp-user' });
    jest.spyOn(User, 'findAll').mockResolvedValue([{ user_id: 'manager-1' }]);
    const send = jest.spyOn(inAppNotification, 'send').mockResolvedValue({});
    const sendToMany = jest.spyOn(inAppNotification, 'sendToMany').mockResolvedValue([]);

    await notifyAttendanceAlerts([
      { employee: employee('e1', 'd1', '张三'), absentDates: ['2026-03-02'], leavePunchDates: [] },
      { employee: employee('e2', 'd1', '李四'), absentDates: [], leavePunchDates: ['2026-03-18'] }
    ]);

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][0].type).toBe(NotificationTypes.ATTENDANCE_ALERT);
    expect(sendToMany).toHaveBeenCalledTimes(1);
    const [managerIds, payload] = sendToMany.mock.calls[0];
    expect(managerIds).toEqual(['manager-1']);
    expect(payload.title).toBe('本部门考勤异常 2 人');
    expect(payload.content).toContain('张三：旷工（未请假也未打卡）：2026-03-02');
    expect(payload.content).toContain('李四：已请假但当天有打卡：2026-03-18');
  });
});

describe('tripReminderJobs', () => {
  const now = new Date('2026-10-23T19:00:00+08:00');
  const trip = (attachments) => ({
    trip_id: 'trip-1',
    trip_number: 'BT202610220001',
    destination: '盱眙县',
    employee_id: 'emp-1',
    start_datetime: new Date('2026-10-23T08:00:00+08:00'),
    end_datetime: new Date('2026-10-24T18:00:00+08:00'),
    attachments: JSON.stringify(attachments)
  });

  test('reminds when today has no watermark photo', async () => {
    jest.spyOn(BusinessTrip, 'findAll').mockResolvedValue([trip([])]);
    jest.spyOn(approvalService, 'findUserIdForEmployee').mockResolvedValue('user-1');
    const send = jest.spyOn(inAppNotification, 'send').mockResolvedValue({});

    await expect(tripReminderJobs.remindMissingWatermarks(now)).resolves.toBe(1);
    expect(send.mock.calls[0][0].type).toBe(NotificationTypes.WATERMARK_MISSING);
    expect(send.mock.calls[0][0].content).toContain('2026-10-23');
  });

  test('does not remind when today already has a watermark photo', async () => {
    jest.spyOn(BusinessTrip, 'findAll').mockResolvedValue([trip([
      { category: 'watermark', taken_at: '2026-10-23T02:00:00.000Z' }
    ])]);
    const send = jest.spyOn(inAppNotification, 'send').mockResolvedValue({});

    await expect(tripReminderJobs.remindMissingWatermarks(now)).resolves.toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  test('reminds an ended, unreimbursed trip only once', async () => {
    const findAll = jest.spyOn(BusinessTrip, 'findAll').mockResolvedValue([trip([])]);
    jest.spyOn(approvalService, 'findUserIdForEmployee').mockResolvedValue('user-1');
    jest.spyOn(inAppNotification, 'exists')
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const send = jest.spyOn(inAppNotification, 'send').mockResolvedValue({});

    await expect(tripReminderJobs.remindUnreimbursedTrips(now)).resolves.toBe(1);
    await expect(tripReminderJobs.remindUnreimbursedTrips(now)).resolves.toBe(0);

    expect(findAll.mock.calls[0][0].where).toEqual(expect.objectContaining({
      status: 'completed', reimbursement_status: 'not_started'
    }));
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].type).toBe(NotificationTypes.REIMBURSEMENT_REMINDER);
  });
});
