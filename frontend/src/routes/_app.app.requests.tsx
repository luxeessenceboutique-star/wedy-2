import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Inbox, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search,
  Filter,
  Loader2,
  Plus
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/components/auth-provider";

export const Route = createFileRoute("/_app/app/requests")({
  component: HRRequestsPage,
});

function HRRequestsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { role, session, profileId } = useAuth();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [reqType, setReqType] = useState("Attestation de travail");
  const [notes, setNotes] = useState("");

  // Role comparison fix: AppRole might be limited to admin/rh. 
  // If role is null or not admin/rh, they are considered an employee.
  const isEmployee = (role as string | null) !== "admin" && (role as string | null) !== "rh";

  const { data: requests, isLoading } = useQuery({
    queryKey: ["hr_requests"],
    queryFn: async () => {
      let query = (supabase.from as any)("hr_requests")
        .select("*, profile:profiles(full_name, email)")
        .order("created_at", { ascending: false });
      
      const { data, error } = await query;
      if (error) {
         console.warn("Table hr_requests non trouvée ou erreur:", error.message);
         return [];
      }
      
      if (isEmployee) {
        return data.filter((r: any) => r.profile?.email === session?.user.email);
      }
      
      return (data as any[]) ?? [];
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-for-reqs"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("*").eq("status", "active");
      return data ?? [];
    },
    enabled: true
  });

  const filtered = (requests ?? []).filter((r: any) => {
    const q = search.toLowerCase();
    const fullName = r.profile?.full_name?.toLowerCase() || "";
    const type = r.type?.toLowerCase() || r.request_type?.toLowerCase() || "";
    return !q || fullName.includes(q) || type.includes(q);
  });

  const statusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await (supabase.from as any)("hr_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Statut mis à jour !");
      qc.invalidateQueries({ queryKey: ["hr_requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!profileId) throw new Error("Profil utilisateur introuvable.");
      
      const { error } = await (supabase.from as any)("hr_requests").insert([{
        profile_id: profileId,
        request_type: reqType,
        notes: notes,
        status: "pending"
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demande soumise avec succès !");
      setOpen(false);
      setNotes("");
      qc.invalidateQueries({ queryKey: ["hr_requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("nav.requests")}</h1>
          <p className="text-muted-foreground">
            Suivez et validez les demandes administratives des employés.
          </p>
        </div>
        <Button className="bg-cyber hover:bg-cyber/90" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle demande
        </Button>
      </div>

      {/* Make request dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Soumettre une demande RH</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type de demande</Label>
              <Select value={reqType} onValueChange={setReqType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Attestation de travail">Attestation de travail</SelectItem>
                  <SelectItem value="Demande de congé">Demande de congé</SelectItem>
                  <SelectItem value="Avance sur salaire">Avance sur salaire</SelectItem>
                  <SelectItem value="Changement d'horaire">Changement d'horaire</SelectItem>
                  <SelectItem value="Fiche de paie">Fiche de paie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes additionnelles (optionnel)</Label>
              <Input placeholder="Précisez votre demande..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button className="w-full bg-cyber" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Envoyer la demande
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher une demande..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-sidebar/30 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Employé</TableHead>
              <TableHead>Type de demande</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-cyber" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
               <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucune demande trouvée.</TableCell></TableRow>
            ) : filtered.map((req: any) => (
              <TableRow key={req.id}>
                <TableCell className="font-medium">
                  {req.profile?.full_name || "—"}
                </TableCell>
                <TableCell>{req.type || req.request_type}</TableCell>
                <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  {req.status === "pending" && (
                    <Badge variant="outline" className="gap-1 border-yellow-500/50 text-yellow-500 bg-yellow-500/10">
                      <Clock className="h-3 w-3" /> En attente
                    </Badge>
                  )}
                  {req.status === "approved" && (
                    <Badge variant="outline" className="gap-1 border-green-500/50 text-green-500 bg-green-500/10">
                      <CheckCircle2 className="h-3 w-3" /> Approuvé
                    </Badge>
                  )}
                  {req.status === "rejected" && (
                    <Badge variant="outline" className="gap-1 border-red-500/50 text-red-500 bg-red-500/10">
                      <XCircle className="h-3 w-3" /> Rejeté
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!isEmployee && req.status === "pending" ? (
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                        onClick={() => statusMut.mutate({ id: req.id, status: "approved" })}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => statusMut.mutate({ id: req.id, status: "rejected" })}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic h-8 flex items-center justify-end">
                      {isEmployee ? "—" : "Traité"}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
