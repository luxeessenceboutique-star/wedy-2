import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { FileText, ArrowRight, Loader2, Upload, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select as UISelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("autre");

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file || !name) throw new Error("Veuillez sélectionner un fichier et donner un nom.");
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name_fr", name);
      formData.append("category", category);

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/templates/import`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Erreur lors de l'importation");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Modèle importé avec succès !");
      setIsImportOpen(false);
      setFile(null);
      setName("");
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{t("templates.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("templates.subtitle")}</p>
        </div>

        <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
          <DialogTrigger asChild>
            <Button className="bg-cyber text-white shadow-glow-cyan">
              <Upload className="me-2 h-4 w-4" />
              Importer un PDF
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Importer un modèle</DialogTitle>
              <DialogDescription>
                Téléchargez un fichier PDF pour le convertir automatiquement en modèle éditable par l'IA.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="file">Fichier PDF</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setFile(f);
                      if (!name) setName(f.name.replace(".pdf", ""));
                    }
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Nom du modèle</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Attestation de Travail"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Catégorie</Label>
                <UISelect value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABEL).map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </UISelect>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsImportOpen(false)}
                disabled={importMutation.isPending}
              >
                Annuler
              </Button>
              <Button
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending || !file || !name}
                className="bg-cyber text-white"
              >
                {importMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                Démarrer l'importation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
