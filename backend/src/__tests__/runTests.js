#!/usr/bin/env node

/**
 * One-Click Test Runner
 * Runs all tests and generates comprehensive report
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n='.repeat(70));
console.log('  人力资源管理系统 - 一键测试脚本');
console.log('='.repeat(70));
console.log('\n开始时间:', new Date().toLocaleString('zh-CN'));

// Test configuration
const tests = [
  {
    name: '认证模块测试',
    file: 'auth.test.js',
    description: '登录、登出、JWT验证、密码安全'
  },
  {
    name: '员工管理模块测试',
    file: 'employees.test.js',
    description: '员工CRUD、Excel导入导出、数据加密'
  },
  {
    name: '部门管理模块测试',
    file: 'departments.test.js',
    description: '部门CRUD、层级关系'
  }
];

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  duration: 0,
  tests: []
};

console.log('\n正在运行测试套件...\n');

// Run each test suite
tests.forEach((test, index) => {
  console.log(`\n[${ index + 1}/${tests.length}] ${test.name}`);
  console.log(`    描述: ${test.description}`);
  console.log('    '.padEnd(70, '-'));

  try {
    const testFilePath = path.join(__dirname, test.file);
    const startTime = Date.now();

    // Run test
    const output = execSync(
      `npx jest ${testFilePath} --json --coverage=false`,
      {
        cwd: path.join(__dirname, '../..'),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      }
    );

    const duration = Date.now() - startTime;
    const result = JSON.parse(output);

    results.tests.push({
      name: test.name,
      passed: result.numPassedTests || 0,
      failed: result.numFailedTests || 0,
      pending: result.numPendingTests || 0,
      duration,
      success: result.success
    });

    results.total += result.numTotalTests || 0;
    results.passed += result.numPassedTests || 0;
    results.failed += result.numFailedTests || 0;
    results.skipped += result.numPendingTests || 0;
    results.duration += duration;

    console.log(`    ✓ 通过: ${result.numPassedTests || 0}`);
    console.log(`    ✗ 失败: ${result.numFailedTests || 0}`);
    console.log(`    ⊘ 跳过: ${result.numPendingTests || 0}`);
    console.log(`    ⏱ 耗时: ${duration}ms`);
  } catch (error) {
    console.error(`    ✗ 测试失败:`, error.message);
    results.tests.push({
      name: test.name,
      error: error.message,
      success: false
    });
  }
});

// Generate coverage report
console.log('\n\n正在生成覆盖率报告...\n');

try {
  execSync(
    'npx jest --coverage --coverageReporters=text --coverageReporters=html',
    {
      cwd: path.join(__dirname, '../..'),
      stdio: 'inherit'
    }
  );
} catch (error) {
  console.error('覆盖率报告生成失败:', error.message);
}

// Print summary
console.log('\n' + '='.repeat(70));
console.log('  测试总结');
console.log('='.repeat(70));
console.log(`\n  总测试数:   ${results.total}`);
console.log(`  ✓ 通过:     ${results.passed} (${((results.passed / results.total) * 100).toFixed(1)}%)`);
console.log(`  ✗ 失败:     ${results.failed}`);
console.log(`  ⊘ 跳过:     ${results.skipped}`);
console.log(`  ⏱ 总耗时:   ${(results.duration / 1000).toFixed(2)}秒`);

// Determine overall status
const allPassed = results.failed === 0;
console.log(`\n  状态:       ${allPassed ? '✓ 所有测试通过' : '✗ 有测试失败'}`);

console.log('\n结束时间:', new Date().toLocaleString('zh-CN'));
console.log('='.repeat(70) + '\n');

// Save results to JSON file
const reportPath = path.join(__dirname, '../../test-results.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`测试结果已保存到: ${reportPath}\n`);

// Exit with appropriate code
process.exit(allPassed ? 0 : 1);
