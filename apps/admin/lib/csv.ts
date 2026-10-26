/**
 * Parses CSV text (RFC 4180: quoted fields, doubled quotes, line breaks inside quotes) into rows of cells.
 * Detects a semicolon delimiter (common in Arabic and European spreadsheet exports) and strips a byte-order mark.
 */
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^﻿/, "");
  const firstLine = source.slice(0, source.search(/\r?\n/) >>> 0);
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0)
      ? ";"
      : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

/** One CSV line, quoting cells that need it. Cells that would start a spreadsheet formula are prefixed with '. */
export const csvLine = (cells: string[]) =>
  cells
    .map((cell) => (/^[=+\-@]/.test(cell) ? `'${cell}` : cell))
    .map((cell) =>
      /[",\n\r;]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell,
    )
    .join(",");
