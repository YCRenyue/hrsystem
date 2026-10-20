/**
 * Document Signing Controller
 * Handles the employee document confirmation/signing flow (company policy
 * acknowledgement, training pledge, employment contract) and the HR-side
 * configuration of the training pledge / employment contract terms that get
 * rendered into those documents. Split out of employeeController to keep
 * each file focused and under the project's per-file line-count guideline.
 */
const { v4: uuidv4 } = require('uuid');
const {
  Employee, User, TrainingPledge, EmploymentContract
} = require('../models');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const { encryptionService } = require('../utils/encryption');
const { recordOperation } = require('../utils/audit');
const { sequelize } = require('../config/database');
const { ossService } = require('../services/OSSService');

/**
 * Persist the employee-fillable party info snapshot for a training pledge at
 * signing time. Party A fields (party_a_name, party_a_address) are
 * HR-controlled and intentionally excluded so employee submissions cannot
 * overwrite them. The ID card is stored AES-256 encrypted, consistent with
 * employees.id_card_encrypted.
 * @param {string} employeeId
 * @param {Object} partyInfo
 * @param {import('sequelize').Transaction} transaction
 */
const applyTrainingPledgePartyInfo = async (employeeId, partyInfo, transaction) => {
  const textFields = [
    'employee_gender',
    'employee_household_address', 'employee_current_address',
    'contract_sign_date', 'contract_start_date', 'contract_end_date'
  ];
  const update = {};
  for (const field of textFields) {
    if (typeof partyInfo[field] === 'string') {
      update[field] = partyInfo[field];
    }
  }
  if (typeof partyInfo.employee_id_card === 'string') {
    update.employee_id_card_encrypted = partyInfo.employee_id_card
      ? encryptionService.encrypt(partyInfo.employee_id_card)
      : null;
  }
  if (Object.keys(update).length > 0) {
    await TrainingPledge.update(update, { where: { employee_id: employeeId }, transaction });
  }
};

/**
 * Persist the employee-fillable party info snapshot for an employment
 * contract at signing time. HR-controlled contract terms (party A info,
 * position, work location, dates, salary) are intentionally excluded so
 * employee submissions cannot overwrite them. The ID card is stored AES-256
 * encrypted, consistent with employees.id_card_encrypted.
 * @param {string} employeeId
 * @param {Object} partyInfo
 * @param {import('sequelize').Transaction} transaction
 */
const applyEmploymentContractPartyInfo = async (employeeId, partyInfo, transaction) => {
  const textFields = ['employee_gender', 'employee_household_address', 'employee_current_address'];
  const update = {};
  for (const field of textFields) {
    if (typeof partyInfo[field] === 'string') {
      update[field] = partyInfo[field];
    }
  }
  if (typeof partyInfo.employee_id_card === 'string') {
    update.employee_id_card_encrypted = partyInfo.employee_id_card
      ? encryptionService.encrypt(partyInfo.employee_id_card)
      : null;
  }
  if (Object.keys(update).length > 0) {
    await EmploymentContract.update(update, { where: { employee_id: employeeId }, transaction });
  }
};

/**
 * Sign a document confirmation (policy ack / training pledge / employment contract)
 * PUT /api/employees/:id/sign-document
 * multipart/form-data fields: documentType, partyInfo (JSON string, optional),
 * password (login password, step-up auth), screenshot (signed document image)
 *
 * Signing is treated as a single all-or-nothing operation: the screenshot is
 * uploaded to OSS BEFORE any database row is touched, and the DB writes run
 * inside one transaction. If the OSS upload fails, or the DB transaction
 * fails after a successful upload (in which case the now-orphaned object is
 * deleted), the request fails with an explicit error and the document is
 * left unsigned - the caller can simply retry the sign action.
 */
const signDocument = async (req, res) => {
  const { id } = req.params;
  const { documentType, password } = req.body;
  let { partyInfo } = req.body;

  const validTypes = ['policy_ack', 'training_pledge', 'employment_contract'];
  if (!validTypes.includes(documentType)) {
    throw new ValidationError(
      `Invalid document type. Must be one of: ${validTypes.join(', ')}`
    );
  }

  if (typeof partyInfo === 'string' && partyInfo.length > 0) {
    try {
      partyInfo = JSON.parse(partyInfo);
    } catch (error) {
      throw new ValidationError('Invalid partyInfo payload');
    }
  }

  const employee = await Employee.findByPk(id);
  if (!employee) {
    throw new NotFoundError('Employee', id);
  }

  // Verify the user owns this employee record or is HR/admin
  const userRole = req.user?.role;
  const userEmployeeId = req.user?.employee_id;
  const isOwner = userEmployeeId === id;
  const isHrOrAdmin = ['admin', 'hr_admin'].includes(userRole);

  if (!isOwner && !isHrOrAdmin) {
    throw new ValidationError('You do not have permission to sign this document');
  }

  const statusField = `${documentType}_status`;
  const signedAtField = `${documentType}_signed_at`;
  const fileKeyField = `${documentType}_file_key`;

  if (employee[statusField]) {
    throw new ValidationError('This document has already been signed');
  }

  // Step-up authentication: re-verify the caller's own login password
  // immediately before signing. This proves control of the authenticated
  // credential at the moment of signing (unlike the previous "retype your
  // own name" check, which anyone able to read the on-screen name could
  // satisfy and proved nothing about who was actually signing).
  if (!password || typeof password !== 'string') {
    throw new ValidationError('请输入登录密码以完成签署验证');
  }
  const signer = await User.scope('withPassword').findByPk(req.user?.user_id);
  if (!signer) {
    throw new ValidationError('签署验证失败：找不到当前登录账户');
  }
  const passwordValid = await signer.verifyPassword(password);
  if (!passwordValid) {
    await recordOperation({
      req,
      operationType: 'sign_verify_failed',
      tableName: 'employees',
      recordId: id,
      newValues: { documentType }
    });
    throw new ValidationError('密码错误，签署验证失败');
  }

  if (!req.file) {
    throw new ValidationError('缺少签署截图，请重试');
  }
  if (!ossService.isConfigured()) {
    throw new ValidationError('文件上传服务未配置，无法完成签署');
  }

  // Upload evidence screenshot to OSS FIRST. The database is only touched if
  // this succeeds, so the document can never end up "signed" with no file.
  const uploadResult = await ossService.uploadFile(id, documentType, req.file);
  if (!uploadResult.success) {
    throw new ValidationError(`签署截图上传失败：${uploadResult.error}，请重试`);
  }

  try {
    await sequelize.transaction(async (transaction) => {
      await employee.update({
        [statusField]: true,
        [signedAtField]: new Date(),
        [fileKeyField]: uploadResult.objectKey
      }, { transaction });

      if (partyInfo && typeof partyInfo === 'object') {
        if (documentType === 'training_pledge') {
          await applyTrainingPledgePartyInfo(id, partyInfo, transaction);
        } else if (documentType === 'employment_contract') {
          await applyEmploymentContractPartyInfo(id, partyInfo, transaction);
        }
      }
    });
  } catch (error) {
    // Roll back the OSS side-effect so a failed sign attempt doesn't leave an
    // orphaned object behind; the original error is what the caller sees.
    await ossService.deleteFile(uploadResult.objectKey);
    throw error;
  }

  await recordOperation({
    req,
    operationType: 'sign_document',
    tableName: 'employees',
    recordId: id,
    newValues: { documentType }
  });

  res.json({
    success: true,
    message: 'Document signed successfully',
    data: {
      documentType,
      signedAt: employee[signedAtField]
    }
  });
};

/**
 * Save or update training pledge details for an employee (HR only)
 * PUT /api/employees/:id/training-pledge
 */
const saveTrainingPledge = async (req, res) => {
  const { id } = req.params;
  const {
    training_cost,
    service_years,
    party_a_name,
    party_a_address
  } = req.body;

  const userRole = req.user?.role;
  if (!['admin', 'hr_admin'].includes(userRole)) {
    throw new ValidationError('Only HR administrators can configure training pledge details');
  }

  if (training_cost === undefined || training_cost === null || Number(training_cost) <= 0) {
    throw new ValidationError('training_cost must be a positive number');
  }

  if (!Number.isInteger(Number(service_years)) || Number(service_years) < 1 || Number(service_years) > 10) {
    throw new ValidationError('service_years must be an integer between 1 and 10');
  }

  if (typeof party_a_name !== 'string' || party_a_name.trim().length === 0) {
    throw new ValidationError('party_a_name is required');
  }
  if (party_a_name.trim().length > 200) {
    throw new ValidationError('party_a_name must be 200 characters or fewer');
  }
  if (typeof party_a_address !== 'string' || party_a_address.trim().length === 0) {
    throw new ValidationError('party_a_address is required');
  }
  if (party_a_address.trim().length > 500) {
    throw new ValidationError('party_a_address must be 500 characters or fewer');
  }

  const employee = await Employee.findByPk(id);
  if (!employee) {
    throw new NotFoundError('Employee', id);
  }

  const [pledge, created] = await TrainingPledge.upsert(
    {
      pledge_id: uuidv4(),
      employee_id: id,
      training_cost: Number(training_cost),
      service_years: Number(service_years),
      party_a_name: party_a_name.trim(),
      party_a_address: party_a_address.trim()
    },
    { conflictFields: ['employee_id'] }
  );

  res.json({
    success: true,
    message: created ? 'Training pledge created' : 'Training pledge updated',
    data: {
      pledge_id: pledge.pledge_id,
      employee_id: pledge.employee_id,
      training_cost: pledge.training_cost,
      service_years: pledge.service_years,
      party_a_name: pledge.party_a_name,
      party_a_address: pledge.party_a_address
    }
  });
};

/**
 * Save or update employment contract terms for an employee (HR only)
 * PUT /api/employees/:id/employment-contract
 * The contract text is a draft template on the frontend (see
 * employmentContractTemplate.ts) pending the reviewed official wording;
 * this only stores the structured terms HR fills in (party A info, position,
 * work location, term dates, salary) used to render that template.
 */
const saveEmploymentContract = async (req, res) => {
  const { id } = req.params;
  const {
    party_a_name,
    party_a_address,
    contract_type,
    position,
    work_location,
    contract_start_date,
    contract_end_date,
    monthly_salary
  } = req.body;

  const userRole = req.user?.role;
  if (!['admin', 'hr_admin'].includes(userRole)) {
    throw new ValidationError('Only HR administrators can configure employment contract details');
  }

  const requiredStrings = {
    party_a_name, party_a_address, contract_type, position, work_location, contract_start_date, contract_end_date
  };
  for (const [field, value] of Object.entries(requiredStrings)) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new ValidationError(`${field} is required`);
    }
  }
  if (party_a_name.trim().length > 200) {
    throw new ValidationError('party_a_name must be 200 characters or fewer');
  }
  if (party_a_address.trim().length > 500) {
    throw new ValidationError('party_a_address must be 500 characters or fewer');
  }
  if (position.trim().length > 100) {
    throw new ValidationError('position must be 100 characters or fewer');
  }
  if (work_location.trim().length > 200) {
    throw new ValidationError('work_location must be 200 characters or fewer');
  }
  if (monthly_salary === undefined || monthly_salary === null || Number(monthly_salary) <= 0) {
    throw new ValidationError('monthly_salary must be a positive number');
  }

  const employee = await Employee.findByPk(id);
  if (!employee) {
    throw new NotFoundError('Employee', id);
  }

  const [contract, created] = await EmploymentContract.upsert(
    {
      contract_id: uuidv4(),
      employee_id: id,
      party_a_name: party_a_name.trim(),
      party_a_address: party_a_address.trim(),
      contract_type: contract_type.trim(),
      position: position.trim(),
      work_location: work_location.trim(),
      contract_start_date: contract_start_date.trim(),
      contract_end_date: contract_end_date.trim(),
      monthly_salary: Number(monthly_salary)
    },
    { conflictFields: ['employee_id'] }
  );

  res.json({
    success: true,
    message: created ? 'Employment contract created' : 'Employment contract updated',
    data: {
      contract_id: contract.contract_id,
      employee_id: contract.employee_id,
      party_a_name: contract.party_a_name,
      party_a_address: contract.party_a_address,
      contract_type: contract.contract_type,
      position: contract.position,
      work_location: contract.work_location,
      contract_start_date: contract.contract_start_date,
      contract_end_date: contract.contract_end_date,
      monthly_salary: contract.monthly_salary
    }
  });
};

module.exports = {
  signDocument,
  saveTrainingPledge,
  saveEmploymentContract
};
