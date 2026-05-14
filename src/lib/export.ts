import ExcelJS from "exceljs";

export async function exportRows(rows: any[], filename: string, format: "xlsx" | "csv") {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);

  if (format === "csv") {
    const escape = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    triggerDownload(blob, `${filename}.csv`);
    return;
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Dados");
  ws.columns = headers.map((h) => ({ header: h, key: h }));
  rows.forEach((r) => ws.addRow(r));
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  triggerDownload(blob, `${filename}.xlsx`);
}

export async function parseImportFile(file: File): Promise<any[]> {
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();

  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    const text = new TextDecoder().decode(buf);
    const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
    if (lines.length === 0) return [];
    const parseLine = (line: string) => {
      const out: string[] = [];
      let cur = "", inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inQ) {
          if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
          else if (c === '"') inQ = false;
          else cur += c;
        } else {
          if (c === '"') inQ = true;
          else if (c === ",") { out.push(cur); cur = ""; }
          else cur += c;
        }
      }
      out.push(cur);
      return out;
    };
    const headers = parseLine(lines[0]);
    return lines.slice(1).map((line) => {
      const cells = parseLine(line);
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => { obj[h] = cells[i] ?? null; });
      return obj;
    });
  }

  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, col) => { headers[col - 1] = String(cell.value ?? ""); });

  const out: any[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => {
      const v = row.getCell(i + 1).value as any;
      obj[h] = v && typeof v === "object" && "text" in v ? v.text : v ?? null;
    });
    out.push(obj);
  });
  return out;
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
