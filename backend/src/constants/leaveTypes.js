/**
 * 请假类型的中文名称（leave_type 枚举值 -> 页面、通知、导出中显示的名称）
 */
const LEAVE_TYPE_LABELS = {
  annual: '年假',
  sick: '病假',
  personal: '事假',
  compensatory: '调休',
  maternity: '产假',
  paternity: '陪产假',
  marriage: '婚假',
  bereavement: '丧假',
  unpaid: '无薪假',
  other: '其他'
};

/**
 * 取请假类型的中文名称，未知类型原样返回
 *
 * @param {string} leaveType - leave_type 枚举值
 * @returns {string} 中文名称
 */
const getLeaveTypeLabel = (leaveType) => LEAVE_TYPE_LABELS[leaveType] || leaveType;

module.exports = { LEAVE_TYPE_LABELS, getLeaveTypeLabel };
