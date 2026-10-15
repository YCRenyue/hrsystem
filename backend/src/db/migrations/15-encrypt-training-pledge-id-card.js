/**
 * Migration: Encrypt training_pledges.employee_id_card
 *
 * Purpose: The employee ID card number captured on the training pledge was
 * stored in plain text (STRING column), inconsistent with the AES-256
 * encryption used for employees.id_card_encrypted. This migration adds an
 * encrypted BLOB column, re-encrypts any existing plaintext values into it,
 * then drops the plaintext column.
 */

const { encryptionService } = require('../../utils/encryption');

module.exports = {
  async up(queryInterface, Sequelize) {
    let columns = await queryInterface.describeTable('training_pledges');

    if (!columns.employee_id_card_encrypted) {
      console.log('Adding employee_id_card_encrypted column to training_pledges table...');
      await queryInterface.addColumn('training_pledges', 'employee_id_card_encrypted', {
        type: Sequelize.BLOB,
        allowNull: true,
        comment: 'Employee ID card number captured at signing time (AES-256 encrypted)'
      });
      columns = await queryInterface.describeTable('training_pledges');
    }

    if (!columns.employee_id_card) {
      console.log('Plaintext employee_id_card column is already absent.');
      return;
    }

    // Only migrate rows not completed by an earlier interrupted attempt.
    const [rows] = await queryInterface.sequelize.query(`
      SELECT pledge_id, employee_id_card
      FROM training_pledges
      WHERE employee_id_card IS NOT NULL
        AND employee_id_card <> ''
        AND employee_id_card_encrypted IS NULL
    `);

    for (const row of rows) {
      const encrypted = encryptionService.encrypt(row.employee_id_card);
      await queryInterface.sequelize.query(
        'UPDATE training_pledges SET employee_id_card_encrypted = ? WHERE pledge_id = ?',
        { replacements: [encrypted, row.pledge_id] }
      );
    }
    console.log(`Re-encrypted ${rows.length} existing employee_id_card value(s).`);

    const [unmigratedRows] = await queryInterface.sequelize.query(`
      SELECT pledge_id
      FROM training_pledges
      WHERE employee_id_card IS NOT NULL
        AND employee_id_card <> ''
        AND employee_id_card_encrypted IS NULL
      LIMIT 1
    `);
    if (unmigratedRows.length > 0) {
      throw new Error('Refusing to drop plaintext ID card column: migration is incomplete');
    }

    await queryInterface.removeColumn('training_pledges', 'employee_id_card');
    console.log('Dropped plaintext employee_id_card column.');
  },

  async down(queryInterface, Sequelize) {
    console.log('Reverting employee_id_card_encrypted migration...');
    let columns = await queryInterface.describeTable('training_pledges');

    if (!columns.employee_id_card) {
      await queryInterface.addColumn('training_pledges', 'employee_id_card', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Employee ID card number captured at signing time'
      });
      columns = await queryInterface.describeTable('training_pledges');
    }

    if (!columns.employee_id_card_encrypted) return;

    const [rows] = await queryInterface.sequelize.query(
      `SELECT pledge_id, employee_id_card_encrypted
       FROM training_pledges
       WHERE employee_id_card_encrypted IS NOT NULL
         AND employee_id_card IS NULL`
    );

    for (const row of rows) {
      try {
        const decrypted = encryptionService.decrypt(row.employee_id_card_encrypted.toString('utf8'));
        await queryInterface.sequelize.query(
          'UPDATE training_pledges SET employee_id_card = ? WHERE pledge_id = ?',
          { replacements: [decrypted, row.pledge_id] }
        );
      } catch (error) {
        console.warn(`Could not decrypt employee_id_card for pledge ${row.pledge_id}: ${error.message}`);
      }
    }

    await queryInterface.removeColumn('training_pledges', 'employee_id_card_encrypted');
  }
};
