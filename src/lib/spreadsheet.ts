import ExcelJS from "exceljs";
import Papa from "papaparse";

export type ParsedSpreadsheet = {
  headers: string[];
  rows: string[][];
};

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return cellToString(value.result as ExcelJS.CellValue);
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
    return "";
  }
  return String(value);
}

async function parseXlsx(buffer: Buffer): Promise<ParsedSpreadsheet> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return { headers: [], rows: [] };

  const rows: string[][] = [];
  worksheet.eachRow((row) => {
    const values = row.values as ExcelJS.CellValue[];
    // ExcelJS `row.values` is 1-indexed (index 0 is unused).
    rows.push(values.slice(1).map(cellToString));
  });

  const [headers, ...dataRows] = rows;
  return { headers: headers ?? [], rows: dataRows };
}

function parseCsv(text: string): ParsedSpreadsheet {
  const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
  const [headers, ...dataRows] = result.data;
  return { headers: headers ?? [], rows: dataRows };
}

export async function parseSpreadsheetFile(buffer: Buffer, fileName: string): Promise<ParsedSpreadsheet> {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "csv") {
    return parseCsv(buffer.toString("utf-8"));
  }
  if (extension === "xlsx" || extension === "xlsm" || extension === "xls") {
    return parseXlsx(buffer);
  }
  throw new Error("Formato de arquivo não suportado. Envie um arquivo .csv ou .xlsx.");
}
