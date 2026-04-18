import jsPDF from "jspdf";
import { format } from "date-fns";

export interface EmployeeVars {
  full_name?: string | null;
  cin?: string | null;
  matricule?: string | null;
  position?: string | null;
  department?: string | null;
  salary?: number | string | null;
  hire_date?: string | null;
  contract_type?: string | null;
  contract_start?: string | null;
  contract_end?: string | null;
  internship_start?: string | null;
  internship_end?: string | null;
  manager?: string | null;
  address?: string | null;
  [key: string]: string | number | null | undefined;
}

const fmtDate = (v: unknown) => {
  if (!v) return "____________";
  try {
    return format(new Date(String(v)), "dd/MM/yyyy");
  } catch {
    return String(v);
  }
};

const isDateField = (k: string) =>
  ["hire_date", "contract_start", "contract_end", "internship_start", "internship_end", "birth_date", "today"].includes(
    k,
  );

export function fillTemplate(template: string, vars: EmployeeVars): string {
  const today = format(new Date(), "dd/MM/yyyy");
  const merged: Record<string, unknown> = { ...vars, today };
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = merged[key];
    if (val === null || val === undefined || val === "") return "____________";
    if (isDateField(key)) return fmtDate(val);
    return String(val);
  });
}

export function exportToPdf(filename: string, title: string, content: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Header band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(34, 211, 238);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("YODABOT", margin, 14);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("TYTHON — Internal HR Document", margin, 21);

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, margin, 42);

  // Body
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  const lines = doc.splitTextToSize(content, contentWidth);
  doc.text(lines, margin, 52);

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(34, 211, 238);
  doc.setLineWidth(0.5);
  doc.line(margin, pageHeight - 22, pageWidth - margin, pageHeight - 22);

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("TYTHON — Application interne YODABOT", margin, pageHeight - 14);
  doc.text(`Émis le ${format(new Date(), "dd/MM/yyyy HH:mm")}`, margin, pageHeight - 9);
  doc.text("Signature & cachet", pageWidth - margin - 35, pageHeight - 9);

  doc.save(filename);
}
