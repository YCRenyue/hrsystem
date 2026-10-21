/**
 * Configurable social insurance and housing fund calculations.
 */

const rate = (name, fallback) => Number(process.env[name] || fallback);
const roundMoney = (value) => Math.round(value * 100) / 100;

const getRates = () => ({
  pensionPersonal: rate('SOCIAL_RATE_PENSION_PERSONAL', 0.08),
  pensionCompany: rate('SOCIAL_RATE_PENSION_COMPANY', 0.16),
  medicalPersonal: rate('SOCIAL_RATE_MEDICAL_PERSONAL', 0.02),
  medicalCompany: rate('SOCIAL_RATE_MEDICAL_COMPANY', 0.10),
  unemploymentPersonal: rate('SOCIAL_RATE_UNEMPLOYMENT_PERSONAL', 0.005),
  unemploymentCompany: rate('SOCIAL_RATE_UNEMPLOYMENT_COMPANY', 0.005),
  injuryCompany: rate('SOCIAL_RATE_INJURY_COMPANY', 0.004),
  maternityCompany: rate('SOCIAL_RATE_MATERNITY_COMPANY', 0.008),
  housingPersonal: rate('HOUSING_FUND_RATE_PERSONAL', 0.07),
  housingCompany: rate('HOUSING_FUND_RATE_COMPANY', 0.07)
});

/**
 * Calculate contributions from declared bases.
 *
 * @param {number} socialBase Social security base
 * @param {number} housingBase Housing fund base
 * @returns {Object} Calculated contribution fields
 */
const calculate = (socialBase, housingBase) => {
  const social = Number(socialBase || 0);
  const housing = Number(housingBase || 0);
  const rates = getRates();
  const values = {
    pension_personal: roundMoney(social * rates.pensionPersonal),
    pension_company: roundMoney(social * rates.pensionCompany),
    medical_personal: roundMoney(social * rates.medicalPersonal),
    medical_company: roundMoney(social * rates.medicalCompany),
    unemployment_personal: roundMoney(social * rates.unemploymentPersonal),
    unemployment_company: roundMoney(social * rates.unemploymentCompany),
    injury_company: roundMoney(social * rates.injuryCompany),
    maternity_company: roundMoney(social * rates.maternityCompany),
    housing_fund_personal: roundMoney(housing * rates.housingPersonal),
    housing_fund_company: roundMoney(housing * rates.housingCompany)
  };
  values.total_personal = roundMoney(
    values.pension_personal + values.medical_personal
    + values.unemployment_personal + values.housing_fund_personal
  );
  values.total_company = roundMoney(
    values.pension_company + values.medical_company
    + values.unemployment_company + values.injury_company
    + values.maternity_company + values.housing_fund_company
  );
  return values;
};

module.exports = { calculate, getRates };
