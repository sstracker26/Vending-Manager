import ExcelJS from "exceljs";

export async function exportExcel(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Data");
  worksheet.addRow(headers);
  for (const row of rows) {
    worksheet.addRow(row.map((v) => (v == null ? "" : v)));
  }
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function triggerFileInput(
  accept: string,
  onFile: (rows: Record<string, string>[], filename: string) => void
): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        onFile([], file.name);
        return;
      }
      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell) => {
        headers.push(String(cell.value ?? "").trim());
      });
      const rows: Record<string, string>[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const record: Record<string, string> = {};
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (header !== undefined) {
            record[header] = String(cell.value ?? "").trim();
          }
        });
        rows.push(record);
      });
      onFile(rows, file.name);
    };
    reader.readAsArrayBuffer(file);
  };
  input.click();
}
