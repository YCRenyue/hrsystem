/**
 * OnboardingProcess security behavior tests.
 */

const { OnboardingProcess } = require('../../models');

describe('OnboardingProcess', () => {
  test('completion never stores a plaintext form snapshot', async () => {
    const process = OnboardingProcess.build({
      employee_id: '00000000-0000-4000-8000-000000000001',
      status: 'sent',
      submitted_data: { id_card: '110101199001011234' }
    });
    process.save = jest.fn().mockResolvedValue(process);

    await process.markAsCompleted({
      phone: '13800000000',
      id_card: '110101199001011234',
      bank_card: '6222000000000000'
    });

    expect(process.status).toBe('completed');
    expect(process.submitted_data).toBeNull();
    expect(process.completed_at).toBeInstanceOf(Date);
    expect(process.save).toHaveBeenCalledTimes(1);
  });

  test('generated form links match the public frontend route', () => {
    const process = OnboardingProcess.build({
      employee_id: '00000000-0000-4000-8000-000000000001'
    });
    process.generateFormToken = jest.fn(() => {
      process.form_token = 'secure-token';
      return process.form_token;
    });

    expect(process.generateFormLink('https://hr.example.com'))
      .toBe('https://hr.example.com/onboarding/secure-token');
  });
});
