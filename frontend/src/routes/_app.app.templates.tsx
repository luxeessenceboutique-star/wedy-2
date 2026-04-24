import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { FileText, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/app/templates")({
  component: TemplatesPage,
});

const CATEGORY_LABEL: Record<string, string> = {
  attestation: "Attestation",
  contrat: "Contrat",
  avenant: "Avenant",
  certificat: "Certificat",
  lettre: "Lettre",
  autre: "Autre",
};

function TemplatesPage() {
  const { t, i18n } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("*")
        .eq("is_active", true)
        .order("category");
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const lang = i18n.language;
  const getName = (tpl: { name_fr: string; name_en: string; name_ar: string }) =>
    lang === "ar" ? tpl.name_ar : lang === "en" ? tpl.name_en : tpl.name_fr;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">{t("templates.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("templates.subtitle")}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.map((tpl) => (
            <Card key={tpl.id} className="group flex h-full flex-col p-5 shadow-card transition hover:border-primary/40 hover:shadow-elegant">
              <div className="flex items-start justify-between">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-cyber text-white shadow-glow-cyan">
                  <FileText className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="capitalize">
                  {CATEGORY_LABEL[tpl.category] ?? tpl.category}
                </Badge>
              </div>
              <h3 className="mt-4 text-base font-semibold">{getName(tpl)}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {tpl.variables.length} {t("templates.variables").toLowerCase()}
              </p>
              <div className="mt-auto pt-4">
                <Link to="/app/generate" search={{ template: tpl.id }}>
                  <Button size="sm" variant="outline" className="w-full group-hover:border-primary group-hover:text-primary">
                    {t("templates.use")}
                    <ArrowRight className="ms-2 h-3.5 w-3.5 rtl-flip" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
