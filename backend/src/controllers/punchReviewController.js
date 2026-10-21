/**
 * Punch Review Controller - 打卡对照表与异常打卡复核
 */

const punchReviewService = require('../services/punch/punchReviewService');
const { recordOperation } = require('../utils/audit');

/**
 * GET /api/punch/mappings?device_type=
 */
const listMappings = async (req, res) => {
  const data = await punchReviewService.listMappings(req.query.device_type);
  res.json({ success: true, data });
};

/**
 * POST /api/punch/mappings
 */
const saveMapping = async (req, res) => {
  const record = await punchReviewService.saveMapping(req.body, req.user.user_id);
  await recordOperation({
    req,
    operationType: 'update',
    tableName: 'punch_card_mappings',
    recordId: record.mapping_id,
    newValues: {
      device_type: record.device_type,
      external_id: record.external_id,
      employee_id: record.employee_id
    }
  });
  res.json({ success: true, message: '对照已保存', data: record });
};

/**
 * DELETE /api/punch/mappings/:id
 */
const deleteMapping = async (req, res) => {
  await punchReviewService.deleteMapping(req.params.id);
  await recordOperation({
    req, operationType: 'delete', tableName: 'punch_card_mappings', recordId: req.params.id
  });
  res.json({ success: true, message: '对照已删除' });
};

/**
 * GET /api/punch/anomalies
 */
const listAnomalies = async (req, res) => {
  const data = await punchReviewService.listAnomalies(req.query);
  res.json({ success: true, data });
};

/**
 * POST /api/punch/anomalies/:id/resolve
 */
const resolveAnomaly = async (req, res) => {
  const anomaly = await punchReviewService.resolveAnomaly(
    req.params.id,
    req.body.resolution,
    req.user.user_id
  );
  await recordOperation({
    req,
    operationType: 'update',
    tableName: 'punch_anomalies',
    recordId: anomaly.anomaly_id,
    newValues: { resolution: anomaly.resolution }
  });
  res.json({ success: true, message: '已处理', data: anomaly });
};

/**
 * POST /api/punch/anomalies/resolve-batch
 */
const resolveAnomalies = async (req, res) => {
  const { ids, resolution } = req.body;
  const data = await punchReviewService.resolveAnomalies(ids, resolution, req.user.user_id);
  await recordOperation({
    req,
    operationType: 'update',
    tableName: 'punch_anomalies',
    newValues: { resolution, count: data.resolved }
  });
  res.json({ success: true, message: `已处理 ${data.resolved} 条`, data });
};

/**
 * GET /api/punch/employee-options
 */
const listEmployeeOptions = async (req, res) => {
  const data = await punchReviewService.listEmployeeOptions();
  res.json({ success: true, data });
};

module.exports = {
  listMappings,
  saveMapping,
  deleteMapping,
  listAnomalies,
  resolveAnomaly,
  resolveAnomalies,
  listEmployeeOptions
};
