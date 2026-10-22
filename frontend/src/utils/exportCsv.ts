/**
 * 把表格数据导出为 CSV（带 BOM，Excel 打开中文不乱码）
 */
import React from 'react';

export interface ExportColumn {
  title?: React.ReactNode;
  dataIndex?: string | string[];
  render?: (value: any, record: any, index: number) => React.ReactNode;
  /** 导出时使用的文本，优先于 render */
  exportValue?: (value: any, record: any) => string | number | null | undefined;
}

const getByPath = (record: any, path?: string | string[]) => {
  if (path === undefined) return undefined;
  const keys = Array.isArray(path) ? path : [path];
  return keys.reduce((obj, key) => (obj == null ? undefined : obj[key]), record);
};

const cellText = (column: ExportColumn, record: any, index: number): string => {
  const raw = getByPath(record, column.dataIndex);
  let value: unknown = raw;
  if (column.exportValue) {
    value = column.exportValue(raw, record);
  } else if (column.render) {
    const rendered = column.render(raw, record, index);
    if (typeof rendered === 'string' || typeof rendered === 'number') value = rendered;
  }
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * 按表格列定义导出数据并触发浏览器下载
 */
export function exportCsv(filename: string, columns: ExportColumn[], rows: any[]): void {
  const header = columns.map((c) => (typeof c.title === 'string' ? c.title : '')).join(',');
  const lines = rows.map((row, i) => columns.map((c) => cellText(c, row, i)).join(','));
  const blob = new Blob(['\uFEFF', [header, ...lines].join('\r\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
