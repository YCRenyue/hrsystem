# Backend Tests

This directory contains all backend tests for the HR Management System.

## Test Structure

```
__tests__/
├── database.test.js      # Database connection and model tests
├── checkConnection.js    # Quick database check script
├── setup.js             # Jest test setup
└── README.md            # This file
```

## Running Tests

### All Tests

```bash
npm test
```

### Database Connection Tests Only

```bash
npm run test:db
```

### Watch Mode (Auto-rerun on file changes)

```bash
npm run test:watch
```

### With Coverage Report

```bash
npm run test:coverage
```

### Verbose Output

```bash
npm run test:verbose
```

## Quick Database Check

Before running the full test suite, you can quickly verify database connectivity:

```bash
npm run check:db
```

This will:
- ✅ Test database authentication
- ✅ Display database configuration
- ✅ Check connection pool settings
- ✅ Run a simple test query
- ✅ List all tables in the database
- ✅ Verify model definitions
- ✅ Check model associations

## Database Connection Tests

The `database.test.js` file includes comprehensive tests for:

### 1. Connection Tests
- Database connection establishment
- Correct dialect configuration (MySQL)
- Connection pool configuration
- Character set and collation (utf8mb4)

### 2. Configuration Tests
- Database name validation
- Host and port configuration
- Soft delete settings (paranoid mode)
- Timestamp configuration
- Naming convention (underscored)

### 3. Model Definition Tests
- Verification of all required models
- Model naming conventions
- Table name mappings
- Required field presence

### 4. Model Association Tests
- Department ↔ Employee relationships
- Employee ↔ User relationships
- Employee ↔ OnboardingProcess relationships
- Parent-child relationships (Department)

### 5. Database Operation Tests
- Basic query execution
- Table existence verification
- Error handling for invalid queries

### 6. Connection Pool Tests
- Pool initialization
- Max/min connection settings
- Acquire and idle timeout configuration

### 7. Error Handling Tests
- Invalid query handling
- Meaningful error messages
- Graceful error recovery

## Prerequisites

Before running tests, ensure:

1. **MySQL Server is Running**
   ```bash
   # Check MySQL status
   mysqladmin ping
   ```

2. **Database Exists**
   ```sql
   CREATE DATABASE hr_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. **Environment Variables Configured**
   - Copy `.env.example` to `.env`
   - Update database credentials in `.env`

4. **Dependencies Installed**
   ```bash
   npm install
   ```

## Test Environment Variables

The tests use the following environment variables from `.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=hr_system
DB_USER=root
DB_PASSWORD=your_password
```

## Troubleshooting

### Connection Refused Error

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Solution:** Start MySQL server
```bash
# Windows
net start MySQL80

# macOS
brew services start mysql

# Linux
sudo service mysql start
```

### Authentication Failed Error

```
Error: Access denied for user 'root'@'localhost'
```

**Solution:** Check database credentials in `.env` file

### Database Not Found Error

```
Error: Unknown database 'hr_system'
```

**Solution:** Create the database
```sql
CREATE DATABASE hr_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Encryption Key Error

```
Error: ENCRYPTION_KEY must be set in environment variables
```

**Solution:** Add encryption key to `.env` file
```env
ENCRYPTION_KEY=your_32_character_encryption_key_here
```

## Writing New Tests

### Test File Naming Convention

- Unit tests: `*.test.js`
- Integration tests: `*.integration.test.js`
- E2E tests: `*.e2e.test.js`

### Example Test Structure

```javascript
describe('Feature Name', () => {
  beforeAll(async () => {
    // Setup before all tests in this describe block
  });

  afterAll(async () => {
    // Cleanup after all tests in this describe block
  });

  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  test('should do something', async () => {
    // Arrange
    const input = 'test';

    // Act
    const result = await someFunction(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

## Coverage Goals

Aim for the following coverage thresholds:

- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

Current thresholds are set to 50% in `jest.config.js` and should be gradually increased as more tests are added.

## CI/CD Integration

These tests are designed to run in CI/CD pipelines. Ensure:

1. Database is available in CI environment
2. Environment variables are properly set
3. Tests run with `npm test` command
4. Coverage reports are generated with `npm run test:coverage`

## Next Steps

After database connection tests pass:

1. Add controller tests
2. Add service/repository layer tests
3. Add middleware tests
4. Add integration tests for API endpoints
5. Add E2E tests for complete workflows
