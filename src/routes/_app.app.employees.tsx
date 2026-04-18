import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit, Trash2, Loader2, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

type Employee = Database["public"]["Tables"]["employees"]["Row"];
type EmployeeInsert = Database["public"]["Tables"]["employees"]["Insert"];

export const Route = createFileRoute("/_app/app/employees")({
  component: EmployeesPage,
});

const STATUS_COLORS: Record<string, string> = {
  active: "bg-success/20 text-success",
  inactive: "bg-muted text-muted-foreground",
  terminated: "bg-destructive/20 text-destructive",
  intern: "bg-accent/20 text-accent",
};

function EmployeesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = (employees ?? []).filter((e) => {
    const q = search.toLowerCase();
    return (
      !q ||
      e.full_name.toLowerCase().includes(q) ||
      e.cin?.toLowerCase().includes(q) ||
      e.matricule?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q)
    );
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("employees.deleted"));
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onEdit = (emp: Employee) => {
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
          <h1 className="font-display text-3xl font-bold tracking-tight">{t("employees.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("employees.subtitle")}</p>
        </div>
        <Button onClick={onAdd} className="bg-cyber text-white shadow-glow-cyan">
          <Plus className="me-2 h-4 w-4" />
          {t("employees.add")}
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("employees.search")}
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
          <p className="text-sm text-muted-foreground">{t("employees.none")}</p>
          <Button onClick={onAdd} variant="outline">
            <Plus className="me-2 h-4 w-4" />
            {t("employees.add")}
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-start">{t("employees.fullName")}</th>
                  <th className="px-4 py-3 text-start">{t("employees.cin")}</th>
                  <th className="px-4 py-3 text-start">{t("employees.position")}</th>
                  <th className="px-4 py-3 text-start">{t("employees.department")}</th>
                  <th className="px-4 py-3 text-start">{t("employees.status")}</th>
                  <th className="px-4 py-3 text-end">{t("employees.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((emp) => (
                  <tr key={emp.id} className="transition hover:bg-secondary/30">
                    <td className="px-4 py-3 font-medium">{emp.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{emp.cin ?? "—"}</td>
                    <td className="px-4 py-3">{emp.position ?? "—"}</td>
                    <td className="px-4 py-3">{emp.department ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_COLORS[emp.status] ?? "bg-muted"}>
                        {t(`employees.status${emp.status[0].toUpperCase()}${emp.status.slice(1)}`)}
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
                            if (confirm(t("employees.confirmDelete"))) delMut.mutate(emp.id);
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

      <EmployeeDialog open={open} onOpenChange={setOpen} employee={editing} />
    </div>
  );
}

function EmployeeDialog({
  open,
  onOpenChange,
  employee,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employee: Employee | null;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const init = (): EmployeeInsert => ({
    full_name: employee?.full_name ?? "",
    cin: employee?.cin ?? "",
    matricule: employee?.matricule ?? "",
    email: employee?.email ?? "",
    phone: employee?.phone ?? "",
    position: employee?.position ?? "",
    department: employee?.department ?? "",
    salary: employee?.salary ?? null,
    hire_date: employee?.hire_date ?? "",
    contract_type: employee?.contract_type ?? "CDI",
    contract_start: employee?.contract_start ?? "",
    contract_end: employee?.contract_end ?? "",
    internship_start: employee?.internship_start ?? "",
    internship_end: employee?.internship_end ?? "",
    manager: employee?.manager ?? "",
    status: employee?.status ?? "active",
    address: employee?.address ?? "",
    birth_date: employee?.birth_date ?? "",
    nationality: employee?.nationality ?? "Marocaine",
    notes: employee?.notes ?? "",
  });

  const [form, setForm] = useState<EmployeeInsert>(init());

  // reset when dialog opens
  useState(() => {
    setForm(init());
  });

  const saveMut = useMutation({
    mutationFn: async (payload: EmployeeInsert) => {
      // strip empty strings to null for date fields
      const cleaned: EmployeeInsert = { ...payload };
      const dateFields: (keyof EmployeeInsert)[] = [
        "hire_date",
        "contract_start",
        "contract_end",
        "internship_start",
        "internship_end",
        "birth_date",
      ];
      for (const f of dateFields) {
        if (cleaned[f] === "") (cleaned as Record<string, unknown>)[f] = null;
      }
      if (cleaned.salary === ("" as unknown as number)) cleaned.salary = null;

      if (employee) {
        const { error } = await supabase.from("employees").update(cleaned).eq("id", employee.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("employees")
          .insert({ ...cleaned, created_by: u.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t("employees.saved"));
      qc.invalidateQueries({ queryKey: ["employees"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof EmployeeInsert>(k: K, v: EmployeeInsert[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v) setForm(init()); }}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employee ? t("employees.edit") : t("employees.add")}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.full_name) return toast.error(t("employees.fullName"));
            saveMut.mutate(form);
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <Field label={t("employees.fullName") + " *"}>
            <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
          </Field>
          <Field label={t("employees.cin")}>
            <Input value={form.cin ?? ""} onChange={(e) => set("cin", e.target.value)} />
          </Field>
          <Field label={t("employees.matricule")}>
            <Input value={form.matricule ?? ""} onChange={(e) => set("matricule", e.target.value)} />
          </Field>
          <Field label={t("employees.email")}>
            <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label={t("employees.phone")}>
            <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label={t("employees.position")}>
            <Input value={form.position ?? ""} onChange={(e) => set("position", e.target.value)} />
          </Field>
          <Field label={t("employees.department")}>
            <Input value={form.department ?? ""} onChange={(e) => set("department", e.target.value)} />
          </Field>
          <Field label={t("employees.salary")}>
            <Input
              type="number"
              value={form.salary ?? ""}
              onChange={(e) => set("salary", e.target.value === "" ? null : Number(e.target.value))}
            />
          </Field>
          <Field label={t("employees.contractType")}>
            <Select
              value={form.contract_type ?? "CDI"}
              onValueChange={(v) => set("contract_type", v as "CDI" | "CDD" | "Stage" | "Freelance")}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CDI">CDI</SelectItem>
                <SelectItem value="CDD">CDD</SelectItem>
                <SelectItem value="Stage">Stage</SelectItem>
                <SelectItem value="Freelance">Freelance</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("employees.status")}>
            <Select
              value={form.status ?? "active"}
              onValueChange={(v) => set("status", v as "active" | "inactive" | "terminated" | "intern")}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t("employees.statusActive")}</SelectItem>
                <SelectItem value="inactive">{t("employees.statusInactive")}</SelectItem>
                <SelectItem value="terminated">{t("employees.statusTerminated")}</SelectItem>
                <SelectItem value="intern">{t("employees.statusIntern")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("employees.hireDate")}>
            <Input type="date" value={form.hire_date ?? ""} onChange={(e) => set("hire_date", e.target.value)} />
          </Field>
          <Field label={t("employees.contractStart")}>
            <Input type="date" value={form.contract_start ?? ""} onChange={(e) => set("contract_start", e.target.value)} />
          </Field>
          <Field label={t("employees.contractEnd")}>
            <Input type="date" value={form.contract_end ?? ""} onChange={(e) => set("contract_end", e.target.value)} />
          </Field>
          <Field label={t("employees.internshipStart")}>
            <Input type="date" value={form.internship_start ?? ""} onChange={(e) => set("internship_start", e.target.value)} />
          </Field>
          <Field label={t("employees.internshipEnd")}>
            <Input type="date" value={form.internship_end ?? ""} onChange={(e) => set("internship_end", e.target.value)} />
          </Field>
          <Field label={t("employees.manager")}>
            <Input value={form.manager ?? ""} onChange={(e) => set("manager", e.target.value)} />
          </Field>
          <Field label={t("employees.birthDate")}>
            <Input type="date" value={form.birth_date ?? ""} onChange={(e) => set("birth_date", e.target.value)} />
          </Field>
          <Field label={t("employees.nationality")}>
            <Input value={form.nationality ?? ""} onChange={(e) => set("nationality", e.target.value)} />
          </Field>
          <Field label={t("employees.address")} full>
            <Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
          </Field>
          <Field label={t("employees.notes")} full>
            <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </Field>

          <DialogFooter className="col-span-full mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("employees.cancel")}
            </Button>
            <Button type="submit" disabled={saveMut.isPending} className="bg-cyber text-white">
              {saveMut.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("employees.save")}
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
// suppress unused import warning
void format;
