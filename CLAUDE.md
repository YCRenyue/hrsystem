# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Development Philosophy

### KISS (Keep It Simple, Stupid)

Simplicity should be a key goal in design. Choose straightforward solutions over complex ones whenever possible. Simple solutions are easier to understand, maintain, and debug.

### YAGNI (You Aren't Gonna Need It)

Avoid building functionality on speculation. Implement features only when they are needed, not when you anticipate they might be useful in the future.

### Design Principles

- **Dependency Inversion**: High-level modules should not depend on low-level modules. Both should depend on abstractions.
- **Open/Closed Principle**: Software entities should be open for extension but closed for modification.
- **Single Responsibility**: Each function, class, and module should have one clear purpose.
- **Fail Fast**: Check for potential errors early and throw exceptions immediately when issues occur.

## ⚠️ MANDATORY Development Workflow

**CRITICAL**: This workflow is REQUIRED for all feature development. Do NOT skip any step.

### Test-Driven Development (TDD) Process

Every feature MUST follow this workflow:

1. **Write Tests First**
   - Before writing any implementation code, write comprehensive tests
   - Tests should cover: happy path, edge cases, error cases, validation
   - Include unit tests for individual functions/methods
   - Include integration tests for API endpoints

2. **Run Tests (They Should Fail)**
   - Run the test suite: `npm run test:all` or `npm test`
   - Verify tests fail with expected errors
   - This confirms tests are actually testing something

3. **Implement the Feature**
   - Write minimal code to make tests pass
   - Follow KISS and YAGNI principles
   - Adhere to code style guidelines (ESLint)

4. **Run Tests Again (They Should Pass)**
   - Run: `npm run test:all`
   - ALL tests must pass before proceeding
   - Fix any failing tests before moving forward

5. **Check Code Quality**
   - Run linter: `npm run lint`
   - Fix all linting errors: `npm run lint:fix`
   - Ensure code coverage meets minimum threshold (50%+)

6. **ONLY THEN: Commit Changes**
   - Stage changes: `git add .`
   - Commit with descriptive message
   - **NEVER commit code with failing tests**
   - **NEVER commit code with linting errors**

### Example TDD Workflow

```bash
# 1. Create test file first
touch backend/src/__tests__/newFeature.test.js

# 2. Write tests (they will fail)
# ... edit newFeature.test.js ...

# 3. Run tests (confirm they fail)
cd backend && npm run test:all

# 4. Implement feature
# ... edit implementation files ...

# 5. Run tests (confirm they pass)
npm run test:all

# 6. Check code quality
npm run lint

# 7. Only if all pass: commit
git add .
git commit -m "feat(module): add new feature with tests"
```

### Automated Test Commands

```bash
# Run all tests with detailed report
cd backend && npm run test:all

# Run specific test file
npx jest src/__tests__/employees.test.js

# Run tests in watch mode (for development)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Check code style
npm run lint
npm run lint:fix  # Auto-fix style issues
```

### Test Coverage Requirements

- **Minimum coverage**: 50% for all metrics (lines, functions, branches, statements)
- **Target coverage**: 80%+ for critical business logic
- Coverage report is generated at `backend/coverage/index.html`
- CI/CD should enforce coverage thresholds

### What to Test

**MUST test:**
- All API endpoints (request/response, status codes, error cases)
- Data validation logic
- Authentication and authorization
- Database operations (CRUD)
- Data encryption/decryption
- Business logic functions
- Error handling

**Optional (but recommended):**
- Edge cases (empty inputs, very large inputs, special characters)
- Performance (for critical paths)
- Concurrent operations

### When Tests Can Be Skipped

**NEVER**. Tests are mandatory for:
- New features
- Bug fixes (add regression test)
- Refactoring (ensure no regression)
- API changes

The ONLY exception is documentation-only changes.

## Project Overview

This is an enterprise HR Management System with deep DingTalk integration, featuring employee onboarding automation, intelligent Q&A, and comprehensive reporting. The system uses a full-stack JavaScript architecture with React frontend and Node.js/Express backend.

## Tech Stack

**Frontend:**
- React 19 with TypeScript
- Ant Design 5.x for UI components
- React Router for navigation
- Axios for API calls

**Backend:**
- Node.js with Express 5.x
- Sequelize ORM with MySQL 8.0
- Redis for caching
- JWT for authentication

**Infrastructure:**
- Docker + Docker Compose for containerization
- MySQL 8.0 as primary database
- Redis for session management and caching
- Nginx as reverse proxy

## 🧱 Code Structure & Modularity

### File and Function Limits

- **Never create a file longer than 500 lines of code**. If approaching this limit, refactor by splitting into modules.
- **Functions should be under 50 lines** with a single, clear responsibility.
- **Classes should be under 100 lines** and represent a single concept or entity.
- **Organize code into clearly separated modules**, grouped by feature or responsibility.
- **Line length should be max 100 characters** (enforced by ESLint/Prettier).

### Project Structure

```
hrsystem/
├── frontend/          # React TypeScript application
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── pages/          # Page-level components
│       ├── services/       # API client services
│       ├── hooks/          # Custom React hooks
│       ├── utils/          # Utility functions
│       ├── types/          # TypeScript type definitions
│       └── __tests__/      # Test files
│
├── backend/           # Node.js Express API
│   └── src/
│       ├── app.js           # Main application entry
│       ├── config/          # Configuration files
│       ├── models/          # Sequelize models
│       ├── repositories/    # Data access layer
│       ├── services/        # Business logic layer
│       ├── routes/          # API route definitions
│       ├── controllers/     # Request handlers
│       ├── middleware/      # Custom middleware
│       ├── utils/           # Utility functions
│       ├── db/             # Database migrations & seeds
│       └── __tests__/      # Test files
│
├── database/          # SQL schema and initialization scripts
├── docker/            # Docker configuration
├── docs/             # Project documentation
└── scripts/          # Utility scripts
```

## Common Development Commands

### Installation and Setup

```bash
# Install all dependencies (root, frontend, backend)
npm run install:all

# Setup environment variables
npm run setup

# Initialize database
npm run db:migrate
npm run db:seed
```

### Development

```bash
# Run both frontend and backend in development mode
npm run dev

# Run backend only (http://localhost:3001)
npm run dev:backend

# Run frontend only (http://localhost:3000)
npm run dev:frontend
```

### Testing

```bash
# Run all tests (frontend + backend)
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend
```

### Database Operations

```bash
# Run database migrations
npm run db:migrate

# Seed sample data
npm run db:seed
```

### Docker Operations

```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# Build Docker images
npm run docker:build

# View logs
npm run docker:logs
```

### Code Quality

```bash
# Run linting on both frontend and backend
npm run lint

# Run backend linting
npm run lint:backend

# Run frontend linting
npm run lint:frontend

# Build production frontend
npm run build
```

## 📋 Style & Conventions

### JavaScript/TypeScript Style Guide

- **Follow Airbnb JavaScript Style Guide** with these specific choices:
  - Line length: 100 characters (enforced by ESLint)
  - Use single quotes for strings in JavaScript
  - Use double quotes for strings in TypeScript
  - Use trailing commas in multi-line structures
  - 2 spaces for indentation
- **Always use TypeScript** for new frontend code
- **Use JSDoc comments** for JavaScript functions in backend
- **Use TSDoc comments** for TypeScript functions in frontend

### Naming Conventions

- **Variables and functions**: `camelCase`
- **Classes and React Components**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Private methods**: `_leadingUnderscore` (convention only)
- **File names**:
  - React components: `PascalCase.tsx`
  - Utilities/services: `camelCase.js` or `camelCase.ts`
  - Tests: `filename.test.js` or `filename.test.ts`

### JSDoc/TSDoc Standards

Use JSDoc for JavaScript backend code:

```javascript
/**
 * Calculate the discounted price for a product
 *
 * @param {number} price - Original price of the product
 * @param {number} discountPercent - Discount percentage (0-100)
 * @param {number} [minAmount=0.01] - Minimum allowed final price
 * @returns {number} Final price after applying discount
 * @throws {Error} If discount_percent is not between 0 and 100
 *
 * @example
 * calculateDiscount(100, 20) // returns 80
 */
function calculateDiscount(price, discountPercent, minAmount = 0.01) {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error('Discount percent must be between 0 and 100');
  }
  const finalPrice = price * (1 - discountPercent / 100);
  if (finalPrice < minAmount) {
    throw new Error(`Final price cannot be below ${minAmount}`);
  }
  return finalPrice;
}
```

Use TypeScript for type safety:

```typescript
/**
 * Calculate the discounted price for a product
 */
function calculateDiscount(
  price: number,
  discountPercent: number,
  minAmount: number = 0.01
): number {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error('Discount percent must be between 0 and 100');
  }
  const finalPrice = price * (1 - discountPercent / 100);
  if (finalPrice < minAmount) {
    throw new Error(`Final price cannot be below ${minAmount}`);
  }
  return finalPrice;
}
```

## Architecture Patterns

### Data Encryption Strategy

The system implements **AES-256 encryption** for sensitive employee data (ID numbers, phone numbers, bank accounts). The encryption layer is located in `backend/src/utils/encryption.js`:

- **Encrypted storage**: Sensitive fields are stored encrypted in the database with `_encrypted` suffix
- **Hash-based search**: Searchable encrypted fields also store a hash with `_hash` suffix for lookups
- **Data masking**: Personal data is masked when displayed to users without proper permissions (e.g., phone numbers show as `138****8888`)
- **Permission-based decryption**: Data is only fully decrypted for users with appropriate role permissions

### Three-Tier Permission System

1. **Super Admin**: Full system access, user management, permission configuration
2. **HR Admin**: Employee information management, report viewing and export, onboarding process management
3. **Employee**: View and edit personal information only, self-service features

Permissions are enforced at:
- Middleware level in `backend/src/middleware/`
- Data access level in repositories
- UI level in frontend routing

### Database Design

The system uses **Sequelize ORM** with the following key models:

- `Employee`: Core employee information with encrypted fields
- `User`: Authentication and authorization
- `Department`: Organizational structure
- `OnboardingProcess`: Tracks employee onboarding workflow
- `OperationLog`: Audit trail for sensitive operations

**Important**: The database schema does NOT use soft deletes (no `deleted_at` column). This is configured in `backend/src/config/database.js` with `paranoid: false`.

### Repository Pattern

Data access is abstracted through repositories (`backend/src/repositories/`):
- Provides consistent interface for data operations
- Handles encryption/decryption automatically
- Implements permission-based data filtering
- Centralized query optimization

### Onboarding Automation Flow

1. **HR Pre-registration**: HR creates basic employee record with minimal info (name, employee number, hire date, department)
2. **Scheduled Task**: On hire date, system automatically:
   - Generates unique form token
   - Creates onboarding process record
   - Sends notification via DingTalk (primary) or SMS (fallback)
3. **Employee Self-Service**: Employee accesses form via token link to complete personal information
4. **Data Merge**: Submitted data merges with HR pre-registered data, status updates to "completed"
5. **HR Fallback**: If employee doesn't complete within timeframe, HR can manually complete the information

## 🧪 Testing Strategy

### Test-Driven Development (TDD)

1. **Write the test first** - Define expected behavior before implementation
2. **Watch it fail** - Ensure the test actually tests something
3. **Write minimal code** - Just enough to make the test pass
4. **Refactor** - Improve code while keeping tests green
5. **Repeat** - One test at a time

### Testing Best Practices

**Backend (Jest):**

```javascript
// Use describe blocks to group related tests
describe('EmployeeService', () => {
  let employeeService;
  let mockDb;

  beforeEach(() => {
    mockDb = createMockDatabase();
    employeeService = new EmployeeService(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Use descriptive test names
  test('should create employee with encrypted sensitive data', async () => {
    const employeeData = {
      name: 'Test User',
      phone: '13888888888',
      idCard: '110101199001011234'
    };

    const result = await employeeService.createEmployee(employeeData);

    expect(result.nameEncrypted).toBeDefined();
    expect(result.phoneEncrypted).toBeDefined();
    expect(result.name).toBeUndefined(); // Plain text should not be stored
  });

  // Test edge cases and error conditions
  test('should throw error when employee number already exists', async () => {
    const employeeData = { employeeNumber: 'EMP001', name: 'Test' };

    await expect(employeeService.createEmployee(employeeData))
      .rejects
      .toThrow('Employee number already exists');
  });
});
```

**Frontend (React Testing Library):**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmployeeForm } from './EmployeeForm';

describe('EmployeeForm', () => {
  test('should submit form with valid data', async () => {
    const mockOnSubmit = jest.fn();

    render(<EmployeeForm onSubmit={mockOnSubmit} />);

    // Fill form
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'John Doe' }
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'john@example.com' }
    });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    // Assert
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com'
      });
    });
  });

  test('should display validation error for invalid email', async () => {
    render(<EmployeeForm onSubmit={jest.fn()} />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'invalid-email' }
    });
    fireEvent.blur(screen.getByLabelText('Email'));

    expect(await screen.findByText('Invalid email format')).toBeInTheDocument();
  });
});
```

### Test Organization

- **Unit tests**: Test individual functions/methods in isolation
- **Integration tests**: Test component interactions (API routes, database operations)
- **E2E tests**: Test complete user workflows (onboarding, employee management)
- **Keep test files next to the code** they test (in `__tests__` subdirectories)
- Aim for **80%+ code coverage**, but focus on critical paths

## 🚨 Error Handling

### Exception Best Practices

**Backend Error Handling:**

```javascript
// Create custom error classes
class ApplicationError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends ApplicationError {
  constructor(message, details = {}) {
    super(message, 400);
    this.details = details;
  }
}

class NotFoundError extends ApplicationError {
  constructor(resource, id) {
    super(`${resource} with id ${id} not found`, 404);
    this.resource = resource;
    this.id = id;
  }
}

class EncryptionError extends ApplicationError {
  constructor(message) {
    super(message, 500);
  }
}

// Use specific error handling in routes/controllers
app.use((err, req, res, next) => {
  // Log error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Handle specific error types
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({
      error: 'Validation Error',
      message: err.message,
      details: err.details
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(err.statusCode).json({
      error: 'Not Found',
      message: err.message
    });
  }

  // Default error response
  res.status(err.statusCode || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});
```

**Async Error Handling Wrapper:**

```javascript
/**
 * Wrapper for async route handlers to catch errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage
router.post('/employees', asyncHandler(async (req, res) => {
  const employee = await employeeService.createEmployee(req.body);
  res.status(201).json({ success: true, data: employee });
}));
```

### Logging Strategy

```javascript
const winston = require('winston');

// Configure structured logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'hr-system' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Usage
logger.info('Employee created', { employeeId: employee.id, createdBy: req.user.id });
logger.error('Failed to encrypt data', { error: err.message, field: 'idCard' });
```

## Environment Configuration

Copy `.env.example` to `.env` and configure:

**Critical Settings:**
- `DB_*`: Database connection parameters
- `JWT_SECRET`: Must be at least 32 characters for production
- `ENCRYPTION_KEY`: Used for AES-256 encryption of sensitive data
- `DINGTALK_*`: DingTalk API credentials for integration
- `PORT`: Backend server port (default 3001)
- `FRONTEND_URL`: Frontend URL for CORS configuration

## DingTalk Integration

The system integrates with DingTalk for:
- OAuth authentication and user login
- Automatic employee account binding via phone number
- Work notifications for onboarding process
- Organization structure synchronization

**Key API endpoints** (when implemented):
- `POST /api/auth/dingtalk/callback`: OAuth callback handler
- `POST /api/dingtalk/notify`: Send work notification
- `GET /api/dingtalk/departments`: Sync department structure

## 🗄️ Database Naming Standards

### Entity-Specific Primary Keys

All database tables use entity-specific primary keys for clarity and consistency:

```sql
-- ✅ STANDARDIZED: Entity-specific primary keys
employees.employee_id VARCHAR(36) PRIMARY KEY
users.user_id VARCHAR(36) PRIMARY KEY
departments.department_id VARCHAR(36) PRIMARY KEY
onboarding_processes.process_id VARCHAR(36) PRIMARY KEY
operation_logs.log_id VARCHAR(36) PRIMARY KEY
```

### Field Naming Conventions

```sql
-- Primary keys: {entity}_id
employee_id, user_id, department_id

-- Foreign keys: {referenced_entity}_id
employee_id REFERENCES employees(employee_id)
department_id REFERENCES departments(department_id)

-- Timestamps: {action}_at
created_at, updated_at, hired_at, completed_at

-- Booleans: is_{state}
is_active, is_complete, data_complete

-- Encrypted fields: {field}_encrypted
name_encrypted, phone_encrypted, id_card_encrypted

-- Hash fields for search: {field}_hash
name_hash, phone_hash

-- Counts: {entity}_count
employee_count, reminder_count
```

### Repository Pattern

The Repository pattern provides consistent data access:

```javascript
class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async findById(id) {
    return await this.model.findByPk(id);
  }

  async findAll(options = {}) {
    return await this.model.findAll(options);
  }

  async create(data) {
    return await this.model.create(data);
  }

  async update(id, data) {
    const record = await this.findById(id);
    if (!record) throw new NotFoundError(this.model.name, id);
    return await record.update(data);
  }

  async delete(id) {
    const record = await this.findById(id);
    if (!record) throw new NotFoundError(this.model.name, id);
    return await record.destroy();
  }
}

// Usage
class EmployeeRepository extends BaseRepository {
  constructor() {
    super(Employee);
  }

  async findByEmployeeNumber(employeeNumber) {
    return await this.model.findOne({ where: { employee_number: employeeNumber } });
  }

  async findByDepartment(departmentId) {
    return await this.model.findAll({ where: { department_id: departmentId } });
  }
}
```

### Model-Database Alignment

Sequelize models mirror database fields exactly:

```javascript
const Employee = sequelize.define('Employee', {
  employee_id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  employee_number: {
    type: DataTypes.STRING(20),
    unique: true,
    allowNull: false
  },
  name_encrypted: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Encrypted employee name'
  },
  name_hash: {
    type: DataTypes.STRING(64),
    comment: 'Hash for searching encrypted names'
  },
  department_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    references: {
      model: 'departments',
      key: 'department_id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'employees',
  underscored: true,  // Use snake_case for column names
  timestamps: true
});
```

## Database Schema Notes

- **Character Set**: All tables use `utf8mb4` with `utf8mb4_unicode_ci` collation for full Unicode support (including emojis)
- **Timestamps**: Sequelize automatically manages `created_at` and `updated_at` fields
- **Foreign Keys**: Defined in Sequelize models with proper cascade rules
- **Indexes**: Critical for encrypted field hashes and foreign keys
- **No Soft Deletes**: `paranoid: false` is set in database config - records are permanently deleted

## Development Guidelines

### When Adding New Features

1. **Encrypted Fields**: If adding sensitive data fields, use the encryption utility in `backend/src/utils/encryption.js`
2. **API Routes**: Follow RESTful conventions, implement in `backend/src/routes/` with corresponding controller
3. **Permissions**: Always add permission checks in middleware for protected routes
4. **Audit Logging**: Log sensitive operations (create/update/delete of employee data) to `operation_logs` table
5. **Frontend API Calls**: Use the centralized axios instance (to be located in `frontend/src/api/`)

### Testing Approach

- **Unit Tests**: Test individual services and utilities
- **Integration Tests**: Test API endpoints with database
- **E2E Tests**: Test critical user flows (onboarding, employee management)

### Database Migrations

When modifying database schema:
1. Create new migration file in `backend/src/db/migrations/`
2. Use Sequelize migrations syntax
3. Always provide both `up` and `down` methods
4. Test migration on clean database before committing

## File Upload Handling

The system supports document uploads (ID cards, contracts, etc.):
- Maximum file size: 10MB (configurable via `MAX_FILE_SIZE`)
- Allowed types: jpg, jpeg, png, pdf, doc, docx, xls, xlsx
- Storage: Local filesystem under `uploads/` directory
- Future: Will migrate to S3-compatible object storage

## 🚀 Performance Considerations

### Optimization Guidelines

- **Profile before optimizing** - Use Node.js profiler or Chrome DevTools
- **Use caching strategically** - Redis for session data, in-memory for computed values
- **Optimize database queries** - Use proper indexes and avoid N+1 queries
- **Implement pagination** - Never return unbounded result sets
- **Use async/await** for I/O-bound operations
- **Consider worker threads** for CPU-intensive tasks (e.g., large Excel processing)

### Current Performance Settings

- **Database Connection Pooling**: Configured in `backend/src/config/database.js`
  - Max connections: 10
  - Min connections: 0
  - Acquire timeout: 30 seconds
  - Idle timeout: 10 seconds
- **Rate Limiting**: API rate limited to 100 requests per 15 minutes per IP
- **Redis Caching**: Used for session storage and frequently accessed data
- **Pagination**: Always implement pagination for list endpoints (default: 10 items per page, max: 100)
- **File Upload**: Max file size 10MB (configurable via `MAX_FILE_SIZE`)

### Example Performance Optimization

```javascript
// Cache expensive queries
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 minute TTL

async function getDepartmentHierarchy() {
  const cacheKey = 'department_hierarchy';
  const cached = cache.get(cacheKey);

  if (cached) {
    logger.debug('Returning cached department hierarchy');
    return cached;
  }

  logger.debug('Fetching department hierarchy from database');
  const departments = await Department.findAll({
    include: [{ model: Department, as: 'children' }],
    order: [['name', 'ASC']]
  });

  cache.set(cacheKey, departments);
  return departments;
}

// Optimize N+1 queries with eager loading
async function getEmployeesWithDepartments() {
  // ✅ Good: Single query with JOIN
  return await Employee.findAll({
    include: [
      { model: Department, attributes: ['department_id', 'name'] },
      { model: Position, attributes: ['position_id', 'title'] }
    ],
    limit: 100
  });

  // ❌ Bad: N+1 queries
  // const employees = await Employee.findAll();
  // for (const emp of employees) {
  //   emp.department = await Department.findByPk(emp.department_id);
  // }
}

// Use streams for large datasets
const { Transform } = require('stream');
const XLSX = require('xlsx');

async function processLargeExcelFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = XLSX.stream.to_json(filePath);

    const processStream = new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        // Process each row
        processEmployeeRow(chunk)
          .then(result => {
            this.push(result);
            callback();
          })
          .catch(callback);
      }
    });

    stream
      .pipe(processStream)
      .on('data', data => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}
```

## 📝 Documentation Standards

### Code Documentation

- Every **module** should have a JSDoc comment explaining its purpose
- All **public functions** must have complete JSDoc/TSDoc comments
- **Complex logic** should have inline comments with clear reasoning
- Keep **README.md** updated with setup instructions and examples
- Maintain **API documentation** using JSDoc or OpenAPI/Swagger

### When to Update Documentation

Update documentation when:
- Adding new features or endpoints
- Changing environment variables or configuration
- Modifying database schema
- Updating deployment procedures
- Adding new dependencies or tools
- Discovering and fixing bugs (add to CHANGELOG)

### Documentation Files to Maintain

- `CLAUDE.md` - This file, patterns and guidance for Claude Code
- `README.md` - Project overview and quick start
- `requirement.md` - Detailed feature requirements
- `docs/architecture.md` - System architecture and design
- `docs/api.md` - API endpoint documentation
- `docs/database.md` - Database schema and design
- `docs/backend.md` - Backend development guide
- `docs/frontend.md` - Frontend development guide

## Deployment

### Docker Deployment (Recommended)

1. Ensure `.env` file is configured
2. Run `npm run docker:up` from project root
3. Services will be available:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - MySQL: localhost:3306
   - Redis: localhost:6379

### Manual Deployment

1. Install dependencies: `npm run install:all`
2. Configure database and Redis
3. Run migrations: `npm run db:migrate`
4. Build frontend: `cd frontend && npm run build`
5. Start backend: `cd backend && npm start`
6. Serve frontend build with Nginx or similar

## Troubleshooting

**Database Connection Issues:**
- Verify MySQL is running and credentials in `.env` are correct
- Check `DB_HOST` is correct ('localhost' for local, 'mysql' for Docker)
- Ensure MySQL user has proper permissions

**Frontend/Backend Connection Issues:**
- Verify `FRONTEND_URL` in backend `.env` matches frontend origin
- Check CORS configuration in `backend/src/app.js`
- Ensure backend is running on expected port

**DingTalk Integration Issues:**
- Verify DingTalk app credentials are correct
- Check DingTalk app has required permissions
- Ensure callback URLs are whitelisted in DingTalk admin panel

## Documentation Reference

For detailed information, refer to:
- `requirement.md`: Comprehensive feature requirements and implementation plan
- `docs/architecture.md`: System architecture and design patterns
- `docs/backend.md`: Backend development guide with code examples
- `docs/database.md`: Database schema and design details
- `docs/api.md`: API endpoint documentation
- `docs/frontend.md`: Frontend architecture and component guide
- `README.md`: Project overview and quick start guide

## 🔄 Git Workflow

### Branch Strategy

- `main` - Production-ready code (protected)
- `develop` - Integration branch for features (if needed)
- `feature/*` - New features (e.g., `feature/onboarding-automation`)
- `fix/*` - Bug fixes (e.g., `fix/encryption-error`)
- `docs/*` - Documentation updates (e.g., `docs/api-endpoints`)
- `refactor/*` - Code refactoring (e.g., `refactor/employee-service`)
- `test/*` - Test additions or fixes (e.g., `test/employee-encryption`)

### Commit Message Format

**Never include "claude code" or "written by claude code" in commit messages**

Format:
```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:

```
feat(auth): add DingTalk OAuth authentication

- Implement OAuth callback handler
- Add user profile synchronization
- Store access tokens securely

Closes #123
```

```
fix(encryption): resolve decryption error for phone numbers

The phone number decryption was failing due to incorrect
encoding. Updated to use base64 encoding consistently.

Fixes #456
```

```
refactor(employee): extract encryption logic to utility

Moved encryption/decryption logic from EmployeeService to
a dedicated EncryptionUtil class for better reusability.
```

### GitHub Flow Summary

```
main (protected) ←── PR ←── feature/your-feature
  ↓                           ↑
deploy                   development
```

### Daily Workflow

1. `git checkout main && git pull origin main`
2. `git checkout -b feature/new-feature`
3. Make changes + write tests
4. `git add . && git commit -m "feat(scope): description"`
5. `git push origin feature/new-feature`
6. Create Pull Request → Review → Merge to main

## 🛡️ Security Best Practices

### Security Guidelines

- **Never commit secrets** - Use environment variables for all sensitive configuration
- **Validate all user input** - Use express-validator or similar
- **Use parameterized queries** - Sequelize handles this automatically
- **Implement rate limiting** - Already configured in `backend/src/app.js`
- **Keep dependencies updated** - Regularly run `npm audit` and `npm update`
- **Use HTTPS** for all external communications in production
- **Implement proper authentication** - JWT tokens with reasonable expiration
- **Hash passwords** - Use bcrypt with appropriate salt rounds

### Critical Security Rules for This Project

- All sensitive employee data (ID numbers, phone numbers, bank accounts) **MUST be encrypted** before storage
- **Never log decrypted sensitive data** - Log only encrypted values or hashes
- Implement **proper permission checks** before returning decrypted data
- Use **parameterized queries** (Sequelize handles this) to prevent SQL injection
- **JWT tokens expire after 24 hours** (configurable via `JWT_EXPIRES_IN`)
- **Rate limiting is enforced** on all API routes (100 requests per 15 minutes)
- Use **HTTPS in production** (configured in Nginx)
- **Audit all sensitive operations** - Log to `operation_logs` table

### Example Security Implementation

```javascript
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Hash password using bcrypt
 */
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 */
async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Generate cryptographically secure token
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}
```

## ⚠️ Important Notes

- **NEVER ASSUME OR GUESS** - When in doubt, ask for clarification
- **Always verify file paths and module names** before use
- **Keep CLAUDE.md updated** when adding new patterns or dependencies
- **Test your code** - No feature is complete without tests
- **Document your decisions** - Future developers (including yourself) will thank you
- **Follow the single responsibility principle** - Each function/class should do one thing well
- **Write self-documenting code** - Use clear names and minimal comments
- **Fail fast** - Check for errors early and throw meaningful exceptions
- **Keep functions under 50 lines** - Break down complex logic into smaller, testable units
- **Keep files under 500 lines** - Split large files into focused modules
- **Follow KISS and YAGNI** - Simple solutions are better, build only what's needed now

## 📚 Useful Resources

### Essential Tools & Libraries

- **Node.js Documentation**: https://nodejs.org/docs/
- **Express.js Guide**: https://expressjs.com/
- **Sequelize ORM**: https://sequelize.org/docs/
- **React Documentation**: https://react.dev/
- **Ant Design Components**: https://ant.design/components/
- **Jest Testing**: https://jestjs.io/docs/
- **React Testing Library**: https://testing-library.com/react

### Best Practices

- **Node.js Best Practices**: https://github.com/goldbergyoni/nodebestpractices
- **JavaScript Style Guide** (Airbnb): https://github.com/airbnb/javascript
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook/
- **React Patterns**: https://reactpatterns.com/

---

_This document is a living guide. Update it as the project evolves and new patterns emerge._
