import * as XLSX from "xlsx";

export function exportExcel(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const data = [headers, ...rows.map((r) => r.map((v) => (v == null ? "" : v)))];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([buf], {
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
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval: "",
      });
      const rows = raw.map((r) => {
        const out: Record<string, string> = {};
        for (const k of Object.keys(r)) {
          out[k.trim()] = String(r[k] ?? "").trim();
        }
        return out;
      });
      onFile(rows, file.name);
    };
    reader.readAsArrayBuffer(file);
  };
  input.click();
}
