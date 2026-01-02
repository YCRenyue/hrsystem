/**
 * Onboarding Controller
 */
const crypto = require('crypto');
const { OnboardingProcess, Employee } = require('../models');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const notificationService = require('../services/NotificationService');
const logger = require('../utils/logger');

/**
 * Get onboarding form by token
 */
const getOnboardingForm = async (req, res) => {
  const { token } = req.params;

  const process = await OnboardingProcess.findOne({
    where: { form_token: token },
    include: [
      {
        model: Employee,
        as: 'employee',
        attributes: ['employee_id', 'employee_number', 'name_encrypted', 'entry_date', 'department_id', 'position']
      }
    ]
  });

  if (!process) {
    throw new NotFoundError('Onboarding process', token);
  }

  // Check if already completed
  if (process.status === 'completed') {
    return res.json({
      success: false,
      message: 'This onboarding form has already been completed'
    });
  }

  // Check if token is expired
  if (process.isTokenExpired()) {
    await process.markAsExpired();
    return res.json({
      success: false,
      message: 'This onboarding form has expired'
    });
  }

  return res.json({
    success: true,
    data: {
      employee_info: {
        name: process.employee.getName(),
        employee_number: process.employee.employee_number,
        position: process.employee.position,
        entry_date: process.employee.entry_date
      },
      form_fields: [
        {
          field: 'phone', label: 'Phone Number', type: 'text', required: true
        },
        {
          field: 'email', label: 'Email', type: 'email', required: true
        },
        {
          field: 'gender', label: 'Gender', type: 'select', options: ['male', 'female'], required: true
        },
        {
          field: 'birth_date', label: 'Birth Date', type: 'date', required: true
        },
        {
          field: 'id_card', label: 'ID Card Number', type: 'text', required: true
        },
        {
          field: 'bank_card', label: 'Bank Card Number', type: 'text', required: false
        },
        {
          field: 'address', label: 'Home Address', type: 'textarea', required: false
        },
        {
          field: 'emergency_contact', label: 'Emergency Contact', type: 'text', required: true
        },
        {
          field: 'emergency_phone', label: 'Emergency Phone', type: 'text', required: true
        }
      ]
    }
  });
};

/**
 * Submit onboarding form
 */
const submitOnboardingForm = async (req, res) => {
  const { token } = req.params;
  const formData = req.body;

  const process = await OnboardingProcess.findOne({
    where: { form_token: token },
    include: [
      {
        model: Employee,
        as: 'employee'
      }
    ]
  });

  if (!process) {
    throw new NotFoundError('Onboarding process', token);
  }

  if (process.status === 'completed') {
    throw new ValidationError('This onboarding form has already been completed');
  }

  // Check if token is expired
  if (process.isTokenExpired()) {
    await process.markAsExpired();
    throw new ValidationError('This onboarding form has expired');
  }

  // Validate required fields
  if (!formData.phone || !formData.email || !formData.id_card) {
    throw new ValidationError('Phone, email, and ID card are required fields');
  }

  // Update employee information using encryption methods
  process.employee.setPhone(formData.phone);
  process.employee.setIdCard(formData.id_card);
  process.employee.setBirthDate(formData.birth_date);

  if (formData.bank_card) {
    process.employee.setBankCard(formData.bank_card);
  }

  process.employee.email = formData.email;
  process.employee.gender = formData.gender;
  process.employee.address = formData.address;
  process.employee.emergency_contact = formData.emergency_contact;
  process.employee.emergency_phone = formData.emergency_phone;

  await process.employee.save();

  // Update onboarding process status
  await process.markAsCompleted(formData);

  res.json({
    success: true,
    message: 'Onboarding information submitted successfully'
  });
};

/**
 * Send onboarding form to employee via email
 * POST /api/onboarding/send/:employeeId
 */
const sendOnboardingForm = async (req, res) => {
  const { employeeId } = req.params;

  const employee = await Employee.findByPk(employeeId);

  if (!employee) {
    throw new NotFoundError('Employee', employeeId);
  }

  if (!employee.email) {
    throw new ValidationError('Employee does not have an email address');
  }

  // Check if onboarding process already exists
  let onboardingProcess = await OnboardingProcess.findOne({
    where: { employee_id: employeeId }
  });

  // Create new process if not exists
  if (!onboardingProcess) {
    const formToken = crypto.randomBytes(32).toString('hex');
    onboardingProcess = await OnboardingProcess.create({
      employee_id: employeeId,
      status: 'pending',
      form_token: formToken,
      token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
  }

  // Generate form URL (use global process object for env)
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const formUrl = `${baseUrl}/onboarding/${onboardingProcess.form_token}`;

  logger.info(`Sending onboarding form to ${employee.email}`, {
    employeeId,
    formUrl
  });

  // Send notification
  const result = await notificationService.sendOnboardingNotification(
    {
      name: employee.getName(),
      email: employee.email,
      dingtalk_user_id: employee.dingtalk_user_id
    },
    formUrl
  );

  // Update process status
  if (result.success) {
    await onboardingProcess.update({
      status: 'sent',
      push_channel: result.channel,
      push_time: new Date(),
      push_status: 'success'
    });
  } else {
    await onboardingProcess.update({
      push_status: 'failed',
      push_error: result.error
    });
  }

  logger.info(`Onboarding form send result: ${result.success ? 'success' : 'failed'}`, {
    channel: result.channel,
    error: result.error
  });

  res.json({
    success: result.success,
    message: result.success
      ? `Onboarding form sent via ${result.channel}`
      : `Failed to send: ${result.error}`,
    data: {
      success: result.success,
      message: result.success
        ? `Onboarding form sent via ${result.channel}`
        : `Failed to send: ${result.error}`,
      channel: result.channel,
      formUrl
    }
  });
};

/**
 * Test email configuration
 * POST /api/onboarding/test-email
 */
const testEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ValidationError('Email address is required');
  }

  logger.info(`Testing email to ${email}`);

  try {
    const result = await notificationService.sendNotification({
      employee: { email, name: 'Test User' },
      title: 'HR System Email Test',
      content: 'This is a test email from the HR System.\n\nIf you received this email, the email configuration is working correctly.',
      type: 'text',
      emailFallback: true
    });

    logger.info(`Test email result: ${result.success ? 'success' : 'failed'}`, result);

    res.json({
      success: result.success,
      message: result.success
        ? `Test email sent successfully via ${result.channel}`
        : `Failed to send test email: ${result.error}`,
      channel: result.channel,
      error: result.error
    });
  } catch (error) {
    logger.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: `Email error: ${error.message}`,
      error: error.message
    });
  }
};

module.exports = {
  getOnboardingForm,
  submitOnboardingForm,
  sendOnboardingForm,
  testEmail
};
