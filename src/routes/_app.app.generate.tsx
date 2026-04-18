import { useEffect, useMemo, useState } from "react";
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
  const [employeeId, setEmployeeId] = useState<string>(search.employee ?? "");
  const [templateId, setTemplateId] = useState<string>(search.template ?? "");

  useEffect(() => {
    if (search.template) setTemplateId(search.template);
    if (search.employee) setEmployeeId(search.employee);
  }, [search]);

  const { data: employees } = useQuery({
    queryKey: ["employees-light"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("*")
        .order("full_name");
      return data ?? [];
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
      return data ?? [];
    },
  });

  const employee = employees?.find((e) => e.id === employeeId);
  const template = templates?.find((t) => t.id === templateId);

  const lang = i18n.language;
  const getName = (tpl: { name_fr: string; name_en: string; name_ar: string }) =>
    lang === "ar" ? tpl.name_ar : lang === "en" ? tpl.name_en : tpl.name_fr;

  const previewContent = useMemo(() => {
    if (!template) return "";
    const vars: EmployeeVars = (employee as unknown as EmployeeVars) ?? {};
    return fillTemplate(template.body_template, vars);
  }, [template, employee]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!employee || !template) throw new Error("Sélection incomplète");
      const { data: u } = await supabase.auth.getUser();
      const docName = getName(template);
      const payload = {
        employee_id: employee.id,
        template_id: template.id,
        generated_by: u.user?.id,
        document_type: docName,
        content: previewContent,
        variables_used: employee as unknown as Record<string, unknown>,
        language: lang,
      };
      const { error } = await (supabase.from("generated_documents") as unknown as {
        insert: (p: typeof payload) => Promise<{ error: Error | null }>;
      }).insert(payload);
      if (error) throw error;
      return docName;
    },
    onSuccess: (docName) => {
      toast.success(t("generate.generated"));
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["recent-docs"] });
      qc.invalidateQueries({ queryKey: ["history"] });
      const safeName = `${docName}-${employee?.full_name ?? ""}`
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "_");
      exportToPdf(`${safeName}.pdf`, docName, previewContent);
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
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("generate.employee")}
            </Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder={t("generate.selectEmployee")} />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.full_name} {e.cin ? `· ${e.cin}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                {templates?.map((tpl) => (
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
                {template.variables.map((v) => (
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

          <Button
            onClick={() => saveMut.mutate()}
            disabled={!employee || !template || saveMut.isPending}
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
                <p className="text-sm">{t("generate.placeholderEmployee")}</p>
              </div>
            ) : (
              <div className="mx-auto max-w-2xl">
                <div className="mb-6 flex items-center justify-between border-b-2 border-cyan-400 pb-3">
                  <div className="font-display text-xl font-bold tracking-tight text-slate-900">
                    YODABOT
                  </div>
                  <div className="text-xs text-slate-500">TYTHON — Document interne</div>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
{previewContent}
                </pre>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
