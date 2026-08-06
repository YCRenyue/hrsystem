/**
 * 审计工具 - 记录敏感操作到 operation_logs
 *
 * 使用约定：
 *  - 仅记录元信息（编号/部门/状态/变更字段名），严禁写入解密后的敏感明文
 *  - 审计写入失败不得阻断主业务流程（吞掉异常并打印告警）
 */

const { OperationLog } = require('../models');

/**
 * 从请求中提取来源 IP
 * @param {Object} req Express request
 * @returns {string|null}
 */
const getIpAddress = (req) => {
  if (!req) return null;
  const forwarded = req.headers && req.headers['x-forwarded-for'];
  return (
    (typeof forwarded === 'string' && forwarded.split(',')[0].trim())
    || req.ip
    || (req.connection && req.connection.remoteAddress)
    || null
  );
};

/**
 * 记录一条审计日志
 * @param {Object} params
 * @param {Object} params.req Express request（取操作人与IP）
 * @param {string} params.operationType create/update/delete/export/role_change/password_reset
 * @param {string} params.tableName 目标数据表
 * @param {string|number} [params.recordId] 目标记录ID
 * @param {Object} [params.oldValues] 变更前元信息（不含敏感明文）
 * @param {Object} [params.newValues] 变更后元信息（不含敏感明文）
 * @returns {Promise<void>}
 */
const recordOperation = async ({
  req,
  operationType,
  tableName,
  recordId,
  oldValues,
  newValues
}) => {
  try {
    await OperationLog.create({
      user_id: (req && req.user && req.user.user_id) || null,
      operation_type: operationType,
      table_name: tableName,
      record_id: recordId != null ? String(recordId) : null,
      old_values: oldValues || null,
      new_values: newValues || null,
      ip_address: getIpAddress(req)
    });
  } catch (error) {
    // 审计失败不阻断主流程（例如表尚未迁移时优雅降级）
    // eslint-disable-next-line no-console
    console.error('[audit] failed to record operation:', error.message);
  }
};

module.exports = { recordOperation };
