const annualLeaveService = require('../../services/AnnualLeaveService');
const socialSecurityService = require('../../services/SocialSecurityCalculationService');

describe('P1 automatic calculations', () => {
  test.each([
    ['2026-01-01', 2026, 0],
    ['2020-01-01', 2026, 5],
    ['2010-01-01', 2026, 10],
    ['2000-01-01', 2026, 15]
  ])('calculates annual leave by service years', (entryDate, year, expected) => {
    expect(annualLeaveService.calculateEntitlement(entryDate, year)).toBe(expected);
  });

  test('calculates personal and company contributions from configured bases', () => {
    const result = socialSecurityService.calculate(10000, 10000);
    expect(result.pension_personal).toBe(800);
    expect(result.pension_company).toBe(1600);
    expect(result.housing_fund_personal).toBe(700);
    expect(result.total_personal).toBe(1750);
    expect(result.total_company).toBe(3470);
  });
});
