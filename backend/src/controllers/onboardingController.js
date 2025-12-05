/**
 * Onboarding Controller
 */
const { OnboardingProcess, Employee } = require('../models');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

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

  res.json({
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

module.exports = {
  getOnboardingForm,
  submitOnboardingForm
};
