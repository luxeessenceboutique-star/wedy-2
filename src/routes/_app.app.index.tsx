import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Users, FileText, FilePlus2, History, TrendingUp, Plus } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/app/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { t } = useTranslation();
  const { fullName } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [emp, docs, tpl, monthDocs] = await Promise.all([
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("generated_documents").select("id", { count: "exact", head: true }),
        supabase.from("document_templates").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase
          .from("generated_documents")
          .select("id", { count: "exact", head: true })
          .gte("created_at", startOfMonth.toISOString()),
      ]);
      return {
        employees: emp.count ?? 0,
        docs: docs.count ?? 0,
        templates: tpl.count ?? 0,
        monthDocs: monthDocs.count ?? 0,
      };
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["recent-docs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("generated_documents")
        .select("id, document_type, created_at, employee:employees(full_name)")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const cards = [
    { icon: Users, label: t("dashboard.totalEmployees"), value: stats?.employees ?? "—", color: "bg-cyber" },
    { icon: FileText, label: t("dashboard.totalDocs"), value: stats?.docs ?? "—", color: "bg-violet-grad" },
    { icon: TrendingUp, label: t("dashboard.thisMonth"), value: stats?.monthDocs ?? "—", color: "bg-cyan-grad" },
    { icon: FilePlus2, label: t("dashboard.templates"), value: stats?.templates ?? "—", color: "bg-violet-grad" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {t("dashboard.welcome")}, {fullName?.split(" ")[0] || "👋"}
        </h1>
        <p className="mt-1 text-muted-foreground">{t("dashboard.overview")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c, i) => (
          <Card key={i} className="p-5 shadow-card transition hover:shadow-elegant">
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${c.color} text-white`}>
              <c.icon className="h-5 w-5" />
            </div>
            <div className="mt-4 text-3xl font-bold">{c.value}</div>
            <div className="mt-1 text-sm text-muted-foreground">{c.label}</div>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Link to="/app/employees" className="block">
          <Card className="group flex h-full items-center gap-4 p-5 transition hover:border-primary/40 hover:shadow-elegant">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-cyber text-white shadow-glow-cyan transition group-hover:scale-110">
              <Plus className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold">{t("dashboard.addEmployee")}</div>
              <div className="text-sm text-muted-foreground">{t("employees.subtitle")}</div>
            </div>
          </Card>
        </Link>
        <Link to="/app/generate" className="block">
          <Card className="group flex h-full items-center gap-4 p-5 transition hover:border-primary/40 hover:shadow-elegant">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-violet-grad text-white shadow-glow-violet transition group-hover:scale-110">
              <FilePlus2 className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold">{t("dashboard.generateDoc")}</div>
              <div className="text-sm text-muted-foreground">{t("generate.subtitle")}</div>
            </div>
          </Card>
        </Link>
        <Link to="/app/history" className="block">
          <Card className="group flex h-full items-center gap-4 p-5 transition hover:border-primary/40 hover:shadow-elegant">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground transition group-hover:scale-110">
              <History className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold">{t("history.title")}</div>
              <div className="text-sm text-muted-foreground">{t("history.subtitle")}</div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Recent docs */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("dashboard.recentDocs")}</h2>
          <Link to="/app/history">
            <Button variant="ghost" size="sm">{t("dashboard.viewAll")}</Button>
          </Link>
        </div>
        {recent && recent.length > 0 ? (
          <div className="divide-y divide-border">
            {recent.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{d.document_type}</div>
                    <div className="text-xs text-muted-foreground">
                      {(d.employee as { full_name?: string } | null)?.full_name ?? "—"}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(d.created_at), "dd/MM/yyyy HH:mm")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {t("dashboard.noDocsYet")}
          </div>
        )}
      </Card>
    </div>
  );
}
