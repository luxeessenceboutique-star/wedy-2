import { useEffect, useMemo, useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { fillTemplate, exportToPdf, type EmployeeVars } from "@/lib/document-generator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const searchSchema = z.object({
  template: z.string().optional(),
  employee: z.string().optional(),
});

export const Route = createFileRoute("/_app/app/generate")({
  validateSearch: searchSchema,
  component: GeneratePage,
});

function GeneratePage() {
  const { t, i18n } = useTranslation();
  const search = Route.useSearch();
  const qc = useQueryClient();
  const [employeeIds, setEmployeeIds] = useState<string[]>(search.employee ? [search.employee] : []);
  const [templateId, setTemplateId] = useState<string>(search.template ?? "");
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [manualVars, setManualVars] = useState<Record<string, string>>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (search.template) setTemplateId(search.template);
    if (search.employee) setEmployeeIds([search.employee]);
  }, [search]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "manual_var") {
        const { key, value } = event.data;
        setManualVars((prev: Record<string, string>) => ({ ...prev, [key]: value }));
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const { data: employees } = useQuery({
    queryKey: ["employees-light"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });

  const { data: templates } = useQuery({
    queryKey: ["templates-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("document_templates")
        .select("*")
        .eq("is_active", true)
        .order("category");
      return (data as any[]) ?? [];
    },
  });

  const selectedEmployees = employees?.filter((e) => employeeIds.includes(e.id)) ?? [];
  const template = templates?.find((t) => t.id === templateId);

  const lang = i18n.language;
  const getName = (tpl: { name_fr: string; name_en: string; name_ar: string }) =>
    lang === "ar" ? tpl.name_ar : lang === "en" ? tpl.name_en : tpl.name_fr;

  const missingVars = useMemo(() => {
    if (!template || selectedEmployees.length === 0) return [];
    const emp = selectedEmployees[0] as any;
    return template.variables.filter((v: string) => !emp[v] && v !== 'today');
  }, [template, selectedEmployees]);

  const previewContent = useMemo(() => {
    if (!template || selectedEmployees.length === 0) return "";
    // Pour aperçu, on utilise le premier employé
    // On ignore manualVars ici pour éviter le refresh de l'iframe pendant la saisie
    const vars: EmployeeVars = (selectedEmployees[0] as unknown as EmployeeVars) ?? {};
    return fillTemplate(template.body_template, vars, true);
  }, [template, selectedEmployees]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (selectedEmployees.length === 0 || !template) throw new Error("Sélection incomplète");
      const { data: u } = await supabase.auth.getUser();
      const docName = getName(template);
      
      const payloads = await Promise.all(selectedEmployees.map(async (emp, idx) => {
        let content = "";
        let mergedVars: any = { ...emp };

        // Si c'est le premier employé (celui de l'aperçu) et qu'on n'est pas en bulk
        if (idx === 0 && !isBulkMode && iframeRef.current?.contentDocument) {
          const doc = iframeRef.current.contentDocument;
          // On récupère les éditions manuelles directement du DOM de l'iframe
          const editableSpans = doc.querySelectorAll(".manual-edit");
          editableSpans.forEach((span: any) => {
            const key = span.getAttribute("data-key");
            const val = span.innerText.trim();
            if (key) mergedVars[key] = val;
          });
          
          // On nettoie le HTML pour le PDF (enlever les styles d'édition)
          const cleanDoc = doc.documentElement.cloneNode(true) as HTMLElement;
          cleanDoc.querySelectorAll(".manual-edit").forEach((span: any) => {
            span.style.border = "none";
            span.style.background = "transparent";
            span.style.padding = "0";
            span.removeAttribute("contenteditable");
          });
          content = cleanDoc.outerHTML;
        } else {
          mergedVars = { ...emp, ...manualVars };
          content = fillTemplate(template.body_template, mergedVars as unknown as EmployeeVars, false);
        }

        return {
          employee_id: emp.id,
          template_id: template.id,
          generated_by: u.user?.id,
          document_type: docName,
          content: content,
          variables_used: mergedVars as unknown as Record<string, unknown>,
          language: lang,
        };
      }));

      const { error } = await (supabase.from("generated_documents") as any).insert(payloads);
      
      if (error) throw error;
      return { docName, payloads };
    },
    onSuccess: ({ docName, payloads }) => {
      toast.success(`${payloads.length} document(s) généré(s) avec succès !`);
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["recent-docs"] });
      qc.invalidateQueries({ queryKey: ["history"] });
      
      // PDF download trigger
      const downloadAll = async () => {
        for (const p of payloads) {
          const empName = (p.variables_used as any).full_name ?? "";
          const safeName = `${docName}-${empName}`.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
          await exportToPdf(`${safeName}.pdf`, docName, p.content);
        }
      };
      downloadAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">{t("generate.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("generate.subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        {/* Form */}
        <Card className="h-fit space-y-4 p-5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Employés sélectionnés ({employeeIds.length})
              </Label>
              <Button variant="ghost" size="sm" onClick={() => setIsBulkMode(!isBulkMode)} className="h-6 text-xs text-cyber">
                {isBulkMode ? "Mode Solo" : "Génération Multiple"}
              </Button>
            </div>
            {!isBulkMode ? (
              <Select value={employeeIds[0] || ""} onValueChange={(v) => setEmployeeIds([v])}>
                <SelectTrigger>
                  <SelectValue placeholder={t("generate.selectEmployee")} />
                </SelectTrigger>
                <SelectContent>
                {employees?.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.full_name} {e.cin ? `· ${e.cin}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="h-[200px] overflow-y-auto border border-border rounded-md p-2 bg-background">
                <div className="mb-2 pb-2 border-b border-border">
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setEmployeeIds(employees?.map(e => e.id) || [])}>Tout cocher</Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setEmployeeIds([])}>Décocher</Button>
                </div>
                {employees?.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 py-1 px-2 hover:bg-muted/50 rounded cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-cyber focus:ring-cyber"
                      checked={employeeIds.includes(e.id)}
                      onChange={(ev) => {
                        if (ev.target.checked) setEmployeeIds([...employeeIds, e.id]);
                        else setEmployeeIds(employeeIds.filter(id => id !== e.id));
                      }}
                    />
                    <span className="text-sm">{e.full_name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("generate.template")}
            </Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder={t("generate.selectTemplate")} />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((tpl: any) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    {getName(tpl)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {template && (
            <div className="rounded-lg bg-secondary/50 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                {t("templates.variables")} ({template.variables.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {template.variables.map((v: string) => (
                  <span
                    key={v}
                    className="rounded-md bg-background px-2 py-0.5 font-mono text-xs text-primary"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          )}

          {missingVars.length > 0 && !isBulkMode && (
            <div className="space-y-3 pt-2 border-t border-border mt-2">
              <Label className="text-xs uppercase tracking-wide text-amber-600 font-semibold flex items-center gap-2">
                Informations Manquantes
              </Label>
              <div className="grid gap-3">
                {missingVars.map((v: string) => (
                  <div key={v} className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">{v}</Label>
                    <Input 
                      value={manualVars[v] || ''} 
                      onChange={e => setManualVars({...manualVars, [v]: e.target.value})}
                      placeholder={`Saisir ${v}...`}
                      className="h-8 text-sm bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={() => saveMut.mutate()}
            disabled={employeeIds.length === 0 || !template || saveMut.isPending}
            className="w-full bg-cyber text-white shadow-glow-cyan"
            size="lg"
          >
            {saveMut.isPending ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="me-2 h-4 w-4" />
            )}
            {t("generate.download")}
          </Button>
        </Card>

        {/* Preview */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-5 py-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{t("generate.preview")}</span>
            </div>
            {template && (
              <span className="text-xs text-muted-foreground">{getName(template)}</span>
            )}
          </div>
          <div className="min-h-[600px] bg-white p-8 shadow-inner">
            {!template ? (
              <div className="flex h-[500px] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <FileText className="h-12 w-12 opacity-30" />
                <p className="text-sm">Sélectionnez au moins un employé pour voir l'aperçu.</p>
              </div>
            ) : (
              <div className="h-[700px] w-full border border-slate-200 rounded-sm overflow-hidden bg-white shadow-sm">
                <iframe
                  ref={iframeRef}
                  srcDoc={previewContent}
                  title="Document Preview"
                  className="h-full w-full border-none"
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
