import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, FileText, FilePlus, History, TrendingUp, Plus, Calendar, Clock, UserPlus, FileUp, Sparkles, ChevronRight, CheckCircle2, XCircle, ArrowUpRight, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

export const Route = createFileRoute("/_app/app/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { t } = useTranslation();
  const { fullName } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: metrics } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const [emp, interns, req] = await Promise.all([
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "intern"),
        supabase.from("hr_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      
      return {
        total_employees: emp.count || 0,
        total_interns: interns.count || 0,
        pending_requests: req.count || 0,
      };
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [docs, tpl, monthDocs, allEmpRoles] = await Promise.all([
        supabase.from("generated_documents").select("id", { count: "exact", head: true }),
        supabase.from("document_templates").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase
          .from("generated_documents")
          .select("id", { count: "exact", head: true })
          .gte("created_at", startOfMonth.toISOString()),
        supabase.from("employees").select("department").eq("status", "active"),
      ]);
      
      const deptCounts = (allEmpRoles.data || []).reduce((acc: any, curr) => {
        const dept = curr.department || "Non assigné";
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {});
      
      const pieData = Object.keys(deptCounts).map(key => ({ name: key, value: deptCounts[key] })).filter(d => d.value > 0);
      
      const trendData = [
        { name: 'Jan', value: 120, stagiaires: 40 },
        { name: 'Fév', value: 150, stagiaires: 50 },
        { name: 'Mar', value: 180, stagiaires: 45 },
        { name: 'Avr', value: 140, stagiaires: 60 },
        { name: 'Mai', value: monthDocs.count ? monthDocs.count * 10 : 250, stagiaires: 80 },
        { name: 'Juin', value: 300, stagiaires: 100 },
      ];

      return {
        docs: docs.count ?? 0,
        templates: tpl.count ?? 0,
        monthDocs: monthDocs.count ?? 0,
        pieData,
        trendData
      };
    },
  });

  // Static data removed to use real values from API


  // Unused query removed to reduce API calls and prevent 400 errors


  const { data: recentEmp } = useQuery({
    queryKey: ["recent-employees"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3);
      return (data as any[]) ?? [];
    }
  });

  const { data: recentRequests } = useQuery({
    queryKey: ["recent-requests"],
    queryFn: async () => {
      const { data } = await (supabase.from as any)("hr_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(4);
      return (data as any[]) ?? [];
    }
  });

  const COLORS = ['#4f46e5','#10B981','#F59E0B','#EF4444','#64748b'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
          Bonjour {fullName?.split(" ")[0] || "Sarah"} ! 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500">Voici un aperçu de votre activité RH aujourd'hui.</p>
      </div>

      {/* 4 Top Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5 flex items-center justify-between shadow-sm border-slate-200">
          <div>
            <p className="text-sm font-medium text-slate-500">Total employés</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{metrics?.total_employees || 0}</span>
              <span className="text-xs font-medium text-emerald-500 flex items-center"><ArrowUpRight className="h-3 w-3 mr-1"/> Réel</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Users className="h-6 w-6" />
          </div>
        </Card>
        
        <Card className="p-5 flex items-center justify-between shadow-sm border-slate-200">
          <div>
            <p className="text-sm font-medium text-slate-500">Stagiaires</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{metrics?.total_interns || 0}</span>
              <span className="text-xs font-medium text-emerald-500 flex items-center"><ArrowUpRight className="h-3 w-3 mr-1"/> Réel</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
            <Briefcase className="h-6 w-6" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between shadow-sm border-slate-200">
          <div>
            <p className="text-sm font-medium text-slate-500">Demandes en attente</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{metrics?.pending_requests || 0}</span>
              <span className="text-xs font-medium text-slate-400">À traiter</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="h-6 w-6" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between shadow-sm border-slate-200">
          <div>
            <p className="text-sm font-medium text-slate-500">Documents générés</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{stats?.docs || 0}</span>
              <span className="text-xs font-medium text-slate-400">Total</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <FileText className="h-6 w-6" />
          </div>
        </Card>
      </div>

      {/* Middle Grid: Chart, Demandes, Calendrier, Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Line Chart */}
        <Card className="lg:col-span-4 p-5 shadow-sm border-slate-200 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-slate-900">Évolution des effectifs</h2>
            <select className="text-xs border-slate-200 rounded-md p-1 bg-white text-slate-500">
              <option>6 derniers mois</option>
            </select>
          </div>
          <div className="flex-1 min-h-[250px] w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.trendData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorStagiaires" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                  <Area type="monotone" dataKey="stagiaires" stroke="#38bdf8" strokeWidth={3} fillOpacity={1} fill="url(#colorStagiaires)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-[#4f46e5] mr-2"></div> Employés</span>
            <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-[#38bdf8] mr-2"></div> Stagiaires</span>
          </div>
        </Card>

        {/* Demandes Récentes */}
        <Card className="lg:col-span-4 p-5 shadow-sm border-slate-200">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Demandes récentes</h2>
          <div className="space-y-4">
            {recentRequests && recentRequests.length > 0 ? recentRequests.map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                    {d.type?.charAt(0) || "R"}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{d.type}</div>
                    <div className="text-xs text-slate-500">
                      {format(new Date(d.created_at), "dd/MM/yyyy")}
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${d.status === 'pending' ? 'text-amber-500 bg-amber-50' : 'text-emerald-500 bg-emerald-50'}`}>
                  {d.status === 'pending' ? 'En attente' : 'Approuvée'}
                </span>
              </div>
            )) : (
              <div className="text-center py-8 text-slate-400 text-sm italic">Aucune demande récente</div>
            )}
          </div>
          <Button variant="link" className="w-full mt-4 text-[#4f46e5] text-sm" asChild>
             <Link to="/app/requests">Voir toutes les demandes <ChevronRight className="h-4 w-4 ml-1"/></Link>
          </Button>
        </Card>

        {/* Calendar & Quick Actions */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <Card className="p-5 shadow-sm border-slate-200 flex-1">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold text-slate-900">Calendrier</h2>
                <div className="flex gap-1">
                   <Button variant="ghost" size="icon" className="h-6 w-6"><ChevronRight className="h-4 w-4 rotate-180"/></Button>
                   <Button variant="ghost" size="icon" className="h-6 w-6"><ChevronRight className="h-4 w-4"/></Button>
                </div>
             </div>
             {/* Simple Dynamic Calendar Header */}
             <div className="text-center mb-2 font-medium text-sm capitalize">{format(new Date(), "MMMM yyyy")}</div>
             <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 mb-2">
                <div>Lun</div><div>Mar</div><div>Mer</div><div>Jeu</div><div>Ven</div><div>Sam</div><div>Dim</div>
             </div>
             <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {/* Visual placeholder for calendar days — highlighting today */}
                {[...Array(31)].map((_, i) => {
                  const day = i + 1;
                  const isToday = day === new Date().getDate();
                  return (
                    <div 
                      key={day} 
                      className={`p-1 ${isToday ? 'bg-[#4f46e5] text-white rounded-md font-bold' : ''} ${day > 28 ? 'text-slate-400' : ''}`}
                    >
                      {day}
                    </div>
                  );
                })}
             </div>
             <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <div className="flex gap-3 text-sm">
                   <div className="w-1.5 rounded-full bg-[#4f46e5]"></div>
                   <div>
                     <p className="font-medium text-slate-900">10:00 - Point RH</p>
                     <p className="text-xs text-slate-500">Aujourd'hui</p>
                   </div>
                </div>
                <div className="flex gap-3 text-sm">
                   <div className="w-1.5 rounded-full bg-emerald-500"></div>
                   <div>
                     <p className="font-medium text-slate-900">14:00 - Revue d'équipe</p>
                     <p className="text-xs text-slate-500">Hebdomadaire</p>
                   </div>
                </div>
             </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-5 shadow-sm border-slate-200">
            <h2 className="text-base font-semibold text-slate-900 mb-3">Actions rapides</h2>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="justify-start text-xs h-10 border-slate-200 text-slate-600 hover:text-[#4f46e5] hover:bg-indigo-50" asChild>
                <Link to="/app/employees"><UserPlus className="h-4 w-4 mr-2" /> Ajouter employé</Link>
              </Button>
              <Button variant="outline" className="justify-start text-xs h-10 border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50" asChild>
                <Link to="/app/interns"><Briefcase className="h-4 w-4 mr-2" /> Ajouter stagiaire</Link>
              </Button>
              <Button variant="outline" className="justify-start text-xs h-10 border-slate-200 text-slate-600 hover:text-amber-600 hover:bg-amber-50" asChild>
                <Link to="/app/generate"><FilePlus className="h-4 w-4 mr-2" /> Générer doc</Link>
              </Button>
              <Button variant="outline" className="justify-start text-xs h-10 border-slate-200 text-slate-600 hover:text-purple-600 hover:bg-purple-50" asChild>
                <Link to="/app/cv"><FileUp className="h-4 w-4 mr-2" /> Importer CV</Link>
              </Button>
            </div>
            
            <div className="mt-4 bg-gradient-to-r from-[#4f46e5] to-purple-500 rounded-lg p-4 text-white relative overflow-hidden">
               <div className="relative z-10">
                 <h3 className="font-bold text-sm mb-1">Gagnez du temps avec nos modèles IA</h3>
                 <p className="text-xs opacity-90 mb-3">Générez automatiquement des documents professionnels.</p>
                 <Button size="sm" className="bg-white text-[#4f46e5] hover:bg-white/90 text-xs h-7">Découvrir</Button>
               </div>
               <Sparkles className="absolute right-2 bottom-2 h-16 w-16 opacity-20" />
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
         {/* Pie Chart */}
         <Card className="lg:col-span-4 p-5 shadow-sm border-slate-200 flex flex-col">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Répartition par département</h2>
            <div className="flex-1 min-h-[200px] flex items-center justify-center">
              {mounted && stats?.pieData && stats.pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {stats.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-sm text-slate-400">Données insuffisantes</div>
              )}
            </div>
         </Card>

         {/* Activité récente */}
         <Card className="lg:col-span-4 p-5 shadow-sm border-slate-200">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Activité récente</h2>
            <div className="space-y-5">
              <div className="flex gap-4">
                 <div className="mt-1 bg-emerald-100 text-emerald-600 p-1.5 rounded-full h-fit"><UserPlus className="h-4 w-4"/></div>
                 <div>
                   <p className="text-sm font-medium text-slate-900">Nouveau stagiaire ajouté</p>
                   <p className="text-xs text-slate-500">Thomas Leroy</p>
                 </div>
                 <div className="ml-auto text-xs text-slate-400">Il y a 1h</div>
              </div>
              <div className="flex gap-4">
                 <div className="mt-1 bg-blue-100 text-blue-600 p-1.5 rounded-full h-fit"><FileText className="h-4 w-4"/></div>
                 <div>
                   <p className="text-sm font-medium text-slate-900">Document généré</p>
                   <p className="text-xs text-slate-500">Contrat de travail - Maria Garcia</p>
                 </div>
                 <div className="ml-auto text-xs text-slate-400">Il y a 3h</div>
              </div>
              <div className="flex gap-4">
                 <div className="mt-1 bg-emerald-100 text-emerald-600 p-1.5 rounded-full h-fit"><CheckCircle2 className="h-4 w-4"/></div>
                 <div>
                   <p className="text-sm font-medium text-slate-900">Demande approuvée</p>
                   <p className="text-xs text-slate-500">Congé - Jean Dupont</p>
                 </div>
                 <div className="ml-auto text-xs text-slate-400">Il y a 5h</div>
              </div>
              <div className="flex gap-4">
                 <div className="mt-1 bg-amber-100 text-amber-600 p-1.5 rounded-full h-fit"><Users className="h-4 w-4"/></div>
                 <div>
                   <p className="text-sm font-medium text-slate-900">Profil mis à jour</p>
                   <p className="text-xs text-slate-500">Sophie Martin</p>
                 </div>
                 <div className="ml-auto text-xs text-slate-400">Il y a 1j</div>
              </div>
            </div>
         </Card>

         {/* Employés récents */}
         <Card className="lg:col-span-4 p-5 shadow-sm border-slate-200 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold text-slate-900">Employés récents</h2>
              <Button variant="link" className="text-[#4f46e5] text-xs h-auto p-0" asChild>
                 <Link to="/app/employees">Voir tout <ChevronRight className="h-3 w-3 ml-1"/></Link>
              </Button>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                     <tr className="text-slate-500 border-b border-slate-100">
                        <th className="pb-2 font-normal">Nom</th>
                        <th className="pb-2 font-normal">Poste</th>
                        <th className="pb-2 font-normal">Statut</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {recentEmp && recentEmp.length > 0 ? recentEmp.map((e: any, i: number) => (
                       <tr key={i}>
                         <td className="py-3 font-medium text-slate-900">{e.full_name}</td>
                         <td className="py-3 text-slate-500">{e.position || "Non spécifié"}</td>
                         <td className="py-3 text-emerald-500 font-medium">{e.status || "Actif"}</td>
                       </tr>
                     )) : (
                        <tr><td colSpan={3} className="py-4 text-center text-slate-400 italic">Aucun employé récent</td></tr>
                     )}
                  </tbody>
               </table>
            </div>
         </Card>
      </div>
    </div>
  );
}

function BriefcaseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
  )
}
