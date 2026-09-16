/**
 * Remove legacy plaintext onboarding form snapshots.
 *
 * Sensitive values are stored in encrypted Employee columns. Keeping the same
 * values in onboarding_processes.submitted_data defeats field encryption.
 */

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      'UPDATE onboarding_processes SET submitted_data = NULL WHERE submitted_data IS NOT NULL'
    );
  },

  // Scrubbed plaintext cannot and should not be reconstructed.
  down: async () => {}
};
