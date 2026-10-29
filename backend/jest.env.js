// Per-test-file environment, loaded before any module (dotenv never overrides values set here).
// Tests must never reach the development database or real external services.
// Stryker runs several Jest instances side by side; give each its own database too
const workerId = process.env.STRYKER_MUTATOR_WORKER !== undefined
  ? `s${process.env.STRYKER_MUTATOR_WORKER}`
  : (process.env.JEST_WORKER_ID || '1');

process.env.NODE_ENV = 'test';
process.env.DB_NAME = `hr_system_test_${workerId}`;
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
process.env.ENCRYPTION_KEY = 'test-encryption-key-0123456789ab';
process.env.ENABLE_SCHEDULER = 'false';
process.env.RATE_LIMIT_MAX_REQUESTS = '100000';
[
  'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS',
  'DINGTALK_APP_KEY', 'DINGTALK_APP_SECRET', 'DINGTALK_AGENT_ID', 'DINGTALK_CORP_ID',
  'ALICLOUD_ACCESS_KEY', 'ALICLOUD_SECRET_KEY', 'OSS_BUCKET', 'OSS_REGION',
  'SMS_ACCESS_KEY_ID', 'SMS_ACCESS_KEY_SECRET'
].forEach((key) => { process.env[key] = ''; });
