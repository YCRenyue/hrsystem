const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1); // Trust first proxy

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
  crossOriginEmbedderPolicy: false
}));
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://47.92.215.251'
];
app.use(cors({
  origin(origin, callback) {
    // 允许无 Origin 请求（curl / health check）
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(
      new Error(`CORS blocked: ${origin}`)
    );
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined'));

// Sensitive data handling middleware (must be before routes)
const { sensitiveDataHandler } = require('./middleware/sensitiveDataHandler');

app.use(sensitiveDataHandler({
  autoMask: true,
  excludePaths: ['/api/auth/login', '/api/health', '/api/auth/register']
}));

// Database connection
const { testConnection } = require('./config/database');

// Test database connection on startup
testConnection();

// Scheduler service
const schedulerService = require('./services/SchedulerService');

// Start scheduler in production or when explicitly enabled
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SCHEDULER === 'true') {
  schedulerService.start();
  console.log('Scheduler service started');
}

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/attendances', require('./routes/attendances'));
app.use('/api/leaves', require('./routes/leaves'));
app.use('/api/users', require('./routes/users'));
app.use('/api/annual-leave', require('./routes/annualLeave'));
app.use('/api/social-security', require('./routes/socialSecurity'));
app.use('/api/business-trips', require('./routes/businessTrip'));
app.use('/api/canteen-meals', require('./routes/canteenMeal'));

// Error handling middleware
const { errorHandler } = require('./middleware/errorHandler');

app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route Not Found. 请求的接口不存在' });
});

app.listen(PORT, () => {
  console.log(`HR System backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
