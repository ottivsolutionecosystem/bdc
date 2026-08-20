export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const escape = (value: string | number | null | undefined) => {
    const text = value == null ? "" : String(value);
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  return [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))].join("\r\n");
}

export function csvFileResponse(filename: string, csv: string): Response {
  const body = `\uFEFF${csv}`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
