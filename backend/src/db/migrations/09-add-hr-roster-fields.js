/**
 * Migration: Add HR roster fields to employees table
 * Adds contract_expiry_date, contract_type, insurance_company, notes
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('employees', 'contract_expiry_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: '合同到期日',
      after: 'leave_date'
    });

    await queryInterface.addColumn('employees', 'contract_type', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: '合同类型（无固定、劳动合同、劳务合同等）',
      after: 'contract_expiry_date'
    });

    await queryInterface.addColumn('employees', 'insurance_company', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: '保险所在公司',
      after: 'contract_type'
    });

    await queryInterface.addColumn('employees', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: '备注',
      after: 'insurance_company'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('employees', 'notes');
    await queryInterface.removeColumn('employees', 'insurance_company');
    await queryInterface.removeColumn('employees', 'contract_type');
    await queryInterface.removeColumn('employees', 'contract_expiry_date');
  }
};
