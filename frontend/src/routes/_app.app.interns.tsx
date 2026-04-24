import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit, Trash2, Loader2, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileUp, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

// Since interns table might be new, we keep types as Row if available, or fallback to any
type Intern = Database["public"]["Tables"]["employees"]["Row"]; // Using employees as base if interns missing from types
type InternInsert = Database["public"]["Tables"]["employees"]["Insert"];

export const Route = createFileRoute("/_app/app/interns")({
  component: InternsPage,
});

const STATUS_COLORS: Record<string, string> = {
  active: "bg-success/20 text-success",
  inactive: "bg-muted text-muted-foreground",
  terminated: "bg-destructive/20 text-destructive",
};

function InternsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Intern | null>(null);

  const { data: interns, isLoading } = useQuery({
    queryKey: ["interns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("status", "intern")
        .order("created_at", { ascending: false });
      
      if (error) {
          console.error(error);
          return [];
      }
      return (data as any[]) ?? [];
    },
  });

  const filtered = (interns ?? []).filter((e: any) => {
    const q = search.toLowerCase();
    return (
      !q ||
      e.full_name?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q)
    );
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("interns.deleted"));
      qc.invalidateQueries({ queryKey: ["interns"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onEdit = (emp: Intern) => {
    setEditing(emp);
    setOpen(true);
  };
  const onAdd = () => {
    setEditing(null);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{t("interns.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("interns.subtitle")}</p>
        </div>
        <Button onClick={onAdd} className="bg-cyber text-white shadow-glow-cyan">
          <Plus className="me-2 h-4 w-4" />
          {t("interns.add")}
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("interns.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-10"
          />
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <UserCircle2 className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("interns.none")}</p>
          <Button onClick={onAdd} variant="outline">
            <Plus className="me-2 h-4 w-4" />
            {t("interns.add")}
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-start">{t("interns.fullName")}</th>
                  <th className="px-4 py-3 text-start">{t("interns.email")}</th>
                  <th className="px-4 py-3 text-start">{t("interns.department")}</th>
                  <th className="px-4 py-3 text-start">{t("interns.school")}</th>
                  <th className="px-4 py-3 text-start">{t("interns.status")}</th>
                  <th className="px-4 py-3 text-end">{t("interns.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((emp: any) => (
                  <tr key={emp.id} className="transition hover:bg-secondary/30">
                    <td className="px-4 py-3 font-medium">{emp.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{emp.email ?? "—"}</td>
                    <td className="px-4 py-3">{emp.department ?? "—"}</td>
                    <td className="px-4 py-3">{emp.school ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_COLORS[emp.status] ?? "bg-muted"}>
                        {emp.status === "active" ? t("interns.statusActive") : t("interns.statusInactive")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => onEdit(emp)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(t("interns.confirmDelete"))) delMut.mutate(emp.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <InternDialog open={open} onOpenChange={setOpen} intern={editing} />
    </div>
  );
}

function InternDialog({
  open,
  onOpenChange,
  intern,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  intern: Intern | null;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const init = (): any => ({
    full_name: intern?.full_name ?? "",
    email: intern?.email ?? "",
    phone: intern?.phone ?? "",
    cin: intern?.cin ?? "",
    department: intern?.department ?? "",
    school: (intern as any)?.school ?? "",
    level: (intern as any)?.level ?? "",
    allowance: (intern as any)?.allowance ?? null,
    internship_start: intern?.internship_start ?? "",
    internship_end: intern?.internship_end ?? "",
    manager: intern?.manager ?? "",
    status: intern?.status ?? "intern",
  });

  const [form, setForm] = useState<any>(init());
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) setForm(init());
  }, [open, intern]);

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    setUploading(true);
    toast.info("Analyse du CV en cours...");
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:8000/api/cv/upload", {
        method: "POST",
        body: formData,
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error("Erreur serveur");

      const data = await response.json();
      const ext = data.extraction || {};
      
      setForm((p: any) => ({
        ...p,
        full_name: ext.full_name || p.full_name,
        email: ext.email || p.email,
        phone: ext.phone || p.phone,
        department: ext.department || p.department || "Stage",
        school: ext.education ? ext.education.substring(0, 50) : p.school, // simpliste
      }));
      
      toast.success("CV analysé ! Formulaire pré-rempli.");
    } catch (err) {
      toast.error("Échec de l'analyse du CV.");
      console.error(err);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = ""; // reset input
    }
  };

  const saveMut = useMutation({
    mutationFn: async (payload: any) => {
      // Filter out fields that don't exist in the employees table
      const { school, level, allowance, ...validFields } = payload;
      
      const cleaned = { 
        ...validFields, 
        status: "intern",
        internship_start: payload.internship_start || null,
        internship_end: payload.internship_end || null,
        notes: `École: ${school || '—'}\nNiveau: ${level || '—'}\nIndemnité: ${allowance || '—'}\n${payload.notes || ''}`.trim()
      };
      
      if (intern) {
        const { error } = await supabase.from("employees").update(cleaned).eq("id", intern.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employees").insert([cleaned]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t("interns.saved"));
      qc.invalidateQueries({ queryKey: ["interns"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v) setForm(init()); }}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader className="flex flex-row items-start justify-between">
          <DialogTitle>{intern ? t("interns.edit") : t("interns.add")}</DialogTitle>
          {!intern && (
            <div className="relative mr-8">
              <input 
                type="file" 
                id="cv-quick-upload" 
                className="hidden" 
                accept=".pdf,.docx,.jpg,.jpeg,.png"
                onChange={handleCVUpload}
                disabled={uploading}
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100 gap-2"
                onClick={() => document.getElementById("cv-quick-upload")?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {uploading ? "Analyse..." : "Remplir via CV (IA)"}
              </Button>
            </div>
          )}
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.full_name) return toast.error(t("interns.fullName"));
            saveMut.mutate(form);
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <Field label={t("interns.fullName") + " *"}>
            <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
          </Field>
          <Field label={t("interns.email")}>
            <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label={t("interns.phone")}>
            <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label={t("interns.cin")}>
            <Input value={form.cin ?? ""} onChange={(e) => set("cin", e.target.value)} />
          </Field>
          <Field label={t("interns.department")}>
            <Input value={form.department ?? ""} onChange={(e) => set("department", e.target.value)} />
          </Field>
          <Field label={t("interns.manager")}>
            <Input value={form.manager ?? ""} onChange={(e) => set("manager", e.target.value)} />
          </Field>
          <Field label={t("interns.school")}>
            <Input value={form.school ?? ""} onChange={(e) => set("school", e.target.value)} />
          </Field>
          <Field label={t("interns.level")}>
            <Input value={form.level ?? ""} onChange={(e) => set("level", e.target.value)} />
          </Field>
          <Field label={t("interns.internshipStart")}>
            <Input type="date" value={form.internship_start ?? ""} onChange={(e) => set("internship_start", e.target.value)} />
          </Field>
          <Field label={t("interns.internshipEnd")}>
            <Input type="date" value={form.internship_end ?? ""} onChange={(e) => set("internship_end", e.target.value)} />
          </Field>
          <Field label={t("interns.allowance")}>
            <Input
              type="number"
              value={form.allowance ?? ""}
              onChange={(e) => set("allowance", e.target.value === "" ? null : Number(e.target.value))}
            />
          </Field>
          <Field label={t("interns.status")}>
            <Select
              value={form.status ?? "intern"}
              onValueChange={(v) => set("status", v as "active" | "inactive" | "terminated" | "intern")}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="intern">{t("interns.statusIntern")}</SelectItem>
                <SelectItem value="active">{t("interns.statusActive")}</SelectItem>
                <SelectItem value="inactive">{t("interns.statusInactive")}</SelectItem>
                <SelectItem value="terminated">{t("interns.statusTerminated")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <DialogFooter className="col-span-full mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("interns.cancel")}
            </Button>
            <Button type="submit" disabled={saveMut.isPending} className="bg-cyber text-white">
              {saveMut.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("interns.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
