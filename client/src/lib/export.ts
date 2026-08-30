export interface ExportColumn {
  key: string;
  label: string;
}

export const EXPORT_BUTTON_CLASS =
  "font-mono text-[10px] uppercase tracking-widest border border-foreground/20 px-2 py-1 hover:border-foreground hover:bg-foreground/5";

function stringifyValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function csvCell(value: unknown): string {
  const text = stringifyValue(value);
  if (/[,"\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(columns: ExportColumn[], rows: Array<Record<string, unknown>>): string {
  return [
    columns.map((column) => csvCell(column.label)).join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column.key])).join(",")),
  ].join("\n");
}

export function toMarkdownTable(columns: ExportColumn[], rows: Array<Record<string, unknown>>): string {
  const header = `| ${columns.map((column) => column.label.replace(/\|/g, "\\|")).join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => {
    const cells = columns.map((column) => stringifyValue(row[column.key]).replace(/\|/g, "\\|").replace(/[\n\r]+/g, " "));
    return `| ${cells.join(" | ")} |`;
  });
  return [header, divider, ...body].join("\n");
}

export function downloadText(filename: string, mime: string, text: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "export";
}
