import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Upload, FileSearch, CheckCircle2, Loader2, MousePointer2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_app/app/cv")({
  component: CVParsingPage,
});

function CVParsingPage() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // Selection state
  const [selectedText, setSelectedText] = useState("");
  const [menuPos, setMenuPos] = useState<{ x: number, y: number } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Veuillez sélectionner un fichier");
      return;
    }

    setUploading(true);
    setResult(null);

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

      if (!response.ok) throw new Error("Erreur lors de l'analyse");

      const data = await response.json();
      setResult(data);
      toast.success("CV analysé avec succès !");
    } catch (error) {
      console.error(error);
      toast.error("Échec de l'analyse du CV par l'IA");
    } finally {
      setUploading(false);
    }
  };

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const text = selection.toString().trim();
      setSelectedText(text);
      
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Position menu near the cursor
      setMenuPos({ x: rect.x + (rect.width / 2), y: rect.bottom + window.scrollY + 10 });
    } else {
      setSelectedText("");
      setMenuPos(null);
    }
  };

  const assignField = (field: string, customName?: string) => {
    if (!result || !selectedText) return;
    
    const targetField = customName || field;
    
    setResult((prev: any) => ({
      ...prev,
      extraction: {
        ...prev.extraction,
        [targetField]: selectedText
      }
    }));
    
    setSelectedText("");
    setMenuPos(null);
    window.getSelection()?.removeAllRanges();
    toast.success(`Champ "${targetField}" mis à jour avec la sélection !`);
  };

  const addCustomField = () => {
    const fieldName = prompt("Nom du nouveau champ (ex: Permis, GitHub, Projets...) :");
    if (fieldName && fieldName.trim()) {
       assignField("custom", fieldName.trim());
    }
  };

  // Helper to get fields not standard
  const standardFields = ['full_name', 'email', 'phone', 'location', 'summary', 'skills', 'education', 'experience', 'certifications', 'languages'];
  const customEntries = result?.extraction ? Object.entries(result.extraction).filter(([k]) => !standardFields.includes(k) && k !== 'raw_json') : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.cv")}</h1>
        <p className="text-muted-foreground">
          Importez un CV. S'il manque des informations, sélectionnez avec la souris le texte sur la gauche pour l'ajouter !
        </p>
      </div>

      <div className={`grid gap-6 ${result ? 'md:grid-cols-2' : ''}`}>
        
        {!result?.raw_text ? (
          <Card className="border-cyber/20 bg-sidebar/50 backdrop-blur max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-cyber" />
                Importation
              </CardTitle>
              <CardDescription>Format supportés: PDF, PNG, JPG, DOCX</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 py-12 transition hover:border-cyber/50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
                }}
              >
                <FileSearch className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="mb-2 text-sm font-medium">
                  {file ? file.name : "Glissez votre CV ici"}
                </p>
                <input
                  type="file"
                  id="cv-upload"
                  className="hidden"
                  accept=".pdf,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                />
                <Button variant="outline" size="sm" asChild className="mt-2">
                  <label htmlFor="cv-upload" className="cursor-pointer">Parcourir</label>
                </Button>
              </div>

              <Button 
                className="w-full bg-cyber hover:bg-cyber/90" 
                disabled={!file || uploading}
                onClick={handleUpload}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyse en cours...
                  </>
                ) : "Lancer l'analyse locale"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-cyber/20 bg-sidebar/50 backdrop-blur flex flex-col items-stretch h-[80vh]">
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MousePointer2 className="h-4 w-4 text-cyber" />
                  Visuel du CV (Sélectionner avec la souris)
                </CardTitle>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setResult(null); setFile(null); }}>
                Scanner un autre CV
              </Button>
            </CardHeader>
            <CardContent 
              className="flex-1 overflow-y-auto p-6 bg-background rounded-b-xl border-t border-border cursor-text relative shadow-inner"
              onMouseUp={handleMouseUp}
            >
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                {result.raw_text}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Floating Menu for text selection */}
        {menuPos && selectedText && (
          <div 
            className="fixed z-50 shadow-xl rounded-md bg-popover border border-border"
            style={{ top: menuPos.y, left: menuPos.x, transform: 'translateX(-50%)' }}
          >
            <DropdownMenu open={true} modal={false}>
              <DropdownMenuTrigger asChild>
                <div aria-hidden className="h-0 w-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                <DropdownMenuLabel className="text-xs font-normal truncate">Sél.: "{selectedText.substring(0, 20)}..."</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => assignField("full_name")}>Assigner au Nom</DropdownMenuItem>
                <DropdownMenuItem onClick={() => assignField("email")}>Assigner à l'Email</DropdownMenuItem>
                <DropdownMenuItem onClick={() => assignField("phone")}>Assigner au Téléphone</DropdownMenuItem>
                <DropdownMenuItem onClick={() => assignField("location")}>Assigner à la Localisation</DropdownMenuItem>
                <DropdownMenuItem onClick={() => assignField("education")}>Assigner à la Formation</DropdownMenuItem>
                <DropdownMenuItem onClick={() => assignField("experience")}>Assigner à l'Expérience</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={addCustomField} className="text-cyber">
                  <Plus className="mr-2 h-4 w-4" /> Ajouter un nouveau champ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {result && (
          <Card className="border-cyber/20 shadow-glow-cyan/5 flex flex-col h-[80vh]">
            <CardHeader className="bg-cyber/5 py-4">
              <CardTitle className="flex items-center gap-2 text-cyber text-lg">
                <CheckCircle2 className="h-5 w-5" />
                Résultat de l'extraction
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Nom Complet</p>
                    <p className="font-medium text-sm">{result.extraction?.full_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Email</p>
                    <p className="font-medium text-sm">{result.extraction?.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Téléphone</p>
                    <p className="font-medium text-sm">{result.extraction?.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Localisation</p>
                    <p className="font-medium text-sm">{result.extraction?.location || "—"}</p>
                  </div>
                </div>

                {/* Custom Fields defined by the user */}
                {customEntries.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                    {customEntries.map(([key, value]) => (
                      <div key={key} className="col-span-2">
                        <p className="text-xs font-semibold uppercase text-cyber">{key}</p>
                        <p className="font-medium text-sm mt-1 bg-cyber/10 p-2 rounded-md whitespace-pre-wrap">{value as string}</p>
                      </div>
                    ))}
                  </div>
                )}

                {result.extraction?.summary && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Profil</p>
                    <p className="mt-1 text-sm text-foreground bg-muted/50 p-2 rounded-md leading-relaxed whitespace-pre-wrap border border-border">
                      {result.extraction.summary}
                    </p>
                  </div>
                )}
                
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Compétences</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {result.extraction?.skills && result.extraction.skills.length > 0 ? (
                      result.extraction.skills.map((s: string, i: number) => (
                        <span key={i} className="rounded-full bg-cyber/10 px-2.5 py-0.5 text-xs text-cyber font-medium border border-cyber/20">
                          {s}
                        </span>
                      ))
                    ) : "—"}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {result.extraction?.education && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Formation</p>
                      <pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-foreground bg-muted/30 p-2 border border-border rounded-md">
                        {result.extraction.education}
                      </pre>
                    </div>
                  )}
                  {result.extraction?.experience && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Expérience</p>
                      <pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-foreground bg-muted/30 p-2 border border-border rounded-md">
                        {result.extraction.experience}
                      </pre>
                    </div>
                  )}
                </div>

                {result.extraction?.certifications && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Certifications</p>
                    <pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-foreground bg-muted/30 p-2 border border-border rounded-md">
                      {result.extraction.certifications}
                    </pre>
                  </div>
                )}

                <div className="rounded-lg bg-sidebar border border-border p-4 mt-6">
                  <p className="mb-2 text-sm font-bold flex items-center gap-2">
                    <BriefcaseIcon />
                    Création Rapide
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">Le système a identifié ce profil comme : <strong className="text-white uppercase">{result.profile_suggestion?.type}</strong></p>
                  <div className="flex gap-2">
                    <Button variant="default" className="flex-1 bg-cyber text-white">
                      Créer Stagiaire
                    </Button>
                    <Button variant="outline" className="flex-1">
                      Créer Salarié
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function BriefcaseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
  )
}
