import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { exportToPdf } from "@/lib/document-generator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/app/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_documents")
        .select(
          "id, document_type, content, created_at, language, employee:employees(full_name), generator:profiles!generated_documents_generated_by_fkey(full_name)",
        )
        .order("created_at", { ascending: false });
      if (error) {
        // fallback without joined generator (FK name may differ)
        const fb = await supabase
          .from("generated_documents")
          .select("id, document_type, content, created_at, language, employee:employees(full_name)")
          .order("created_at", { ascending: false });
        return fb.data ?? [];
      }
      return (data as any[]) ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">{t("history.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("history.subtitle")}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !data || data.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("history.none")}</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-start">{t("history.document")}</th>
                  <th className="px-4 py-3 text-start">{t("history.employee")}</th>
                  <th className="px-4 py-3 text-start">{t("history.date")}</th>
                  <th className="px-4 py-3 text-end">{t("employees.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((d) => {
                  const emp = (d.employee as { full_name?: string } | null)?.full_name ?? "—";
                  return (
                    <tr key={d.id} className="transition hover:bg-secondary/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="font-medium">{d.document_type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{emp}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(d.created_at), "dd/MM/yyyy HH:mm")}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const safe = `${d.document_type}-${emp}`
                              .replace(/[^\w\s-]/g, "")
                              .replace(/\s+/g, "_");
                            exportToPdf(`${safe}.pdf`, d.document_type, d.content);
                          }}
                        >
                          <Download className="me-2 h-3.5 w-3.5" />
                          {t("history.download")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
