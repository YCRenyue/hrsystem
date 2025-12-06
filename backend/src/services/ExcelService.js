const ExcelJS = require('exceljs');
const { ValidationError } = require('../middleware/errorHandler');

/**
 * Excel Service
 * Provides common Excel operations for import/export/template generation
 */
class ExcelService {
  /**
   * Parse date value from Excel cell
   * @param {any} value - Cell value
   * @returns {string|null} - Formatted date string or null
   */
  static parseExcelDate(value) {
    if (!value) return null;

    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    if (typeof value === 'string') {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (datePattern.test(value)) {
        return value;
      }
    }

    return null;
  }

  /**
   * Get cell value as string
   * @param {any} cell - Excel cell
   * @returns {string|null}
   */
  static getCellValue(cell) {
    if (!cell || cell.value === null || cell.value === undefined) {
      return null;
    }

    if (typeof cell.value === 'object' && cell.value.text) {
      return String(cell.value.text).trim();
    }

    return String(cell.value).trim();
  }

  /**
   * Create workbook with template data
   * @param {Array} columns - Array of column definitions
   * @param {Array} sampleData - Optional sample data rows
   * @returns {ExcelJS.Workbook}
   */
  static createTemplate(columns, sampleData = []) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    // Add headers
    worksheet.columns = columns.map(col => ({
      header: col.header,
      key: col.key,
      width: col.width || 15
    }));

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add sample data if provided
    if (sampleData.length > 0) {
      sampleData.forEach(row => {
        worksheet.addRow(row);
      });
    }

    // Add data validation and comments if specified
    columns.forEach((col, index) => {
      const colLetter = String.fromCharCode(65 + index);

      // Add comment/note if specified
      if (col.note) {
        worksheet.getCell(`${colLetter}1`).note = col.note;
      }

      // Add data validation if specified
      if (col.validation) {
        const colRange = `${colLetter}2:${colLetter}1000`;
        worksheet.getCell(colRange).dataValidation = col.validation;
      }
    });

    return workbook;
  }

  /**
   * Import data from Excel buffer
   * @param {Buffer} buffer - Excel file buffer
   * @param {Function} rowParser - Function to parse each row
   * @param {number} startRow - Row number to start parsing (default: 2)
   * @returns {Promise<Object>} - Import results
   */
  static async importFromBuffer(buffer, rowParser, startRow = 2) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new ValidationError('Excel file is empty');
    }

    const results = {
      success_count: 0,
      error_count: 0,
      errors: []
    };

    for (let rowNum = startRow; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);

      // Skip empty rows
      const hasData = row.values.some(
        value => value !== null && value !== undefined && value !== ''
      );
      if (!hasData) continue;

      try {
        await rowParser(row, rowNum);
        results.success_count++;
      } catch (error) {
        results.errors.push({
          row: rowNum,
          message: error.message
        });
        results.error_count++;
      }
    }

    return results;
  }

  /**
   * Export data to Excel
   * @param {Array} data - Data array to export
   * @param {Array} columns - Column definitions
   * @param {string} sheetName - Worksheet name
   * @returns {Promise<ExcelJS.Workbook>}
   */
  static async exportToExcel(data, columns, sheetName = 'Data') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Define columns
    worksheet.columns = columns.map(col => ({
      header: col.header,
      key: col.key,
      width: col.width || 15
    }));

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data rows
    data.forEach(item => {
      const row = {};
      columns.forEach(col => {
        if (col.formatter) {
          row[col.key] = col.formatter(item);
        } else {
          row[col.key] = item[col.key];
        }
      });
      worksheet.addRow(row);
    });

    // Auto-fit columns (optional)
    worksheet.columns.forEach(column => {
      let maxLength = column.header.length;
      column.eachCell({ includeEmpty: false }, cell => {
        const cellLength = cell.value ? String(cell.value).length : 0;
        if (cellLength > maxLength) {
          maxLength = cellLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    return workbook;
  }

  /**
   * Send Excel file as response
   * @param {Object} res - Express response object
   * @param {ExcelJS.Workbook} workbook - Workbook to send
   * @param {string} filename - File name
   */
  static async sendExcelResponse(res, workbook, filename) {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    await workbook.xlsx.write(res);
    res.end();
  }
}

module.exports = ExcelService;
