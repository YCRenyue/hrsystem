/**
 * Trip Reminder Jobs - 出差相关的定时站内提醒
 *
 *  - 出差期间当天还没有水印打卡照片：每天晚上提醒员工
 *  - 出差已结束但还没有提交报销：提醒员工一次
 *
 * 只写站内通知（铃铛），由 SchedulerService 定时调用。
 */

const { Op } = require('sequelize');
const { BusinessTrip } = require('../models');
const inAppNotification = require('./InAppNotificationService');
const approvalService = require('./approvalService');
const { auditWatermarkPhotos } = require('./BusinessTripService');
const { formatLocalDate } = require('../utils/dateUtils');
const logger = require('../utils/logger');

// 只提醒最近结束的出差，避免上线时把历史出差全部提醒一遍
const REIMBURSEMENT_LOOKBACK_DAYS = 30;

/**
 * 出差期间当天没有水印打卡的，提醒员工上传
 *
 * @param {Date} [now=new Date()]
 * @returns {Promise<number>} 发送的提醒数
 */
const remindMissingWatermarks = async (now = new Date()) => {
  const today = formatLocalDate(now);
  const trips = await BusinessTrip.findAll({
    where: {
      status: { [Op.in]: ['approved', 'in_progress'] },
      start_datetime: { [Op.lte]: now },
      end_datetime: { [Op.gte]: new Date(`${today}T00:00:00+08:00`) }
    }
  });

  let sent = 0;
  for (const trip of trips) {
    try {
      if (!auditWatermarkPhotos(trip).missing.includes(today)) continue;
      // eslint-disable-next-line no-await-in-loop -- few active trips per day
      const recipientUserId = await approvalService.findUserIdForEmployee(trip.employee_id);
      if (!recipientUserId) continue;
      // eslint-disable-next-line no-await-in-loop -- few active trips per day
      await inAppNotification.send({
        recipientUserId,
        type: inAppNotification.NotificationTypes.WATERMARK_MISSING,
        title: '今天还没有水印打卡',
        content: `出差单 ${trip.trip_number}（${trip.destination}）今天（${today}）`
          + '还没有上传水印打卡照片，请在出差详情页上传。',
        relatedResource: 'business_trip',
        relatedId: trip.trip_id,
        linkUrl: `/business-trips/${trip.trip_id}`
      });
      sent += 1;
    } catch (err) {
      logger.error('[tripReminder.watermark] failed', { error: err.message, tripId: trip.trip_id });
    }
  }
  return sent;
};

/**
 * 出差结束后还没有报销的，提醒员工提交报销（每张出差单只提醒一次）
 *
 * @param {Date} [now=new Date()]
 * @returns {Promise<number>} 发送的提醒数
 */
const remindUnreimbursedTrips = async (now = new Date()) => {
  const since = new Date(now.getTime() - REIMBURSEMENT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const trips = await BusinessTrip.findAll({
    where: {
      status: 'completed',
      reimbursement_status: 'not_started',
      end_datetime: { [Op.between]: [since, now] }
    }
  });

  const type = inAppNotification.NotificationTypes.REIMBURSEMENT_REMINDER;
  let sent = 0;
  for (const trip of trips) {
    try {
      // eslint-disable-next-line no-await-in-loop -- few trips end each day
      const recipientUserId = await approvalService.findUserIdForEmployee(trip.employee_id);
      if (!recipientUserId) continue;
      // eslint-disable-next-line no-await-in-loop -- few trips end each day
      if (await inAppNotification.exists({ recipientUserId, type, relatedId: trip.trip_id })) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop -- few trips end each day
      await inAppNotification.send({
        recipientUserId,
        type,
        title: '出差已结束，请提交报销',
        content: `出差单 ${trip.trip_number}（${trip.destination}）已结束，`
          + '如有差旅费用，请新建报销单并关联该出差单。',
        relatedResource: 'business_trip',
        relatedId: trip.trip_id,
        linkUrl: '/reimbursements/new'
      });
      sent += 1;
    } catch (err) {
      logger.error('[tripReminder.reimburse] failed', { error: err.message, tripId: trip.trip_id });
    }
  }
  return sent;
};

module.exports = {
  remindMissingWatermarks,
  remindUnreimbursedTrips
};
