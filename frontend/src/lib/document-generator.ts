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

export function fillTemplate(template: string, vars: EmployeeVars, isPreview: boolean = false): string {
  const today = format(new Date(), "dd/MM/yyyy");
  const merged: Record<string, unknown> = { ...vars, today };
  
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = merged[key];
    if (val === null || val === undefined || val === "") {
      if (isPreview) {
        return `<span 
          class="empty-field-box manual-edit" 
          contenteditable="true"
          data-key="${key}"
          style="display: inline-block; min-width: 120px; min-height: 18px; border: 1px dashed #0ea5e9; background: #f0f9ff; border-radius: 3px; padding: 0 5px; vertical-align: middle; outline: none; cursor: text;"
        ></span>`;
      }
      return "";
    }
    if (isDateField(key)) return fmtDate(val);
    return String(val);
  });
}

export async function exportToPdf(filename: string, title: string, content: string) {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
  });

  // Create a temporary container to render the HTML
  const container = document.createElement("div");
  container.style.width = "210mm"; // A4 Width
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.innerHTML = content;
  document.body.appendChild(container);

  try {
    await doc.html(container, {
      callback: function (doc) {
        doc.save(filename);
        document.body.removeChild(container);
      },
      x: 0,
      y: 0,
      width: 210,
      windowWidth: 794, // Standard A4 pixel width at 96dpi
      autoPaging: "text",
    });
  } catch (error) {
    console.error("PDF Export error:", error);
    document.body.removeChild(container);
    // Fallback simple si html2canvas échoue
    doc.text("Erreur lors de la génération du PDF complexe.", 10, 10);
    doc.save(filename);
  }
}
