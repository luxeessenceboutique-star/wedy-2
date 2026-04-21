import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  FileText,
  Zap,
  Download,
  Search,
  Shield,
  Globe,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LangSwitcher } from "@/components/lang-switcher";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "YODABOT — Génération automatique des documents RH | TYTHON" },
      {
        name: "description",
        content:
          "Plateforme interne TYTHON. Centralisez vos salariés, générez attestations, contrats et certificats en moins de 3 secondes. Conforme Code du Travail Maroc.",
      },
      { property: "og:title", content: "YODABOT — TYTHON HR Automation" },
      {
        property: "og:description",
        content: "Vos documents RH générés en 3 secondes. Application interne TYTHON.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { t } = useTranslation();

  const features = [
    { icon: FileText, title: t("features.f1Title"), desc: t("features.f1Desc") },
    { icon: Zap, title: t("features.f2Title"), desc: t("features.f2Desc") },
    { icon: Download, title: t("features.f3Title"), desc: t("features.f3Desc") },
    { icon: Search, title: t("features.f4Title"), desc: t("features.f4Desc") },
    { icon: Shield, title: t("features.f5Title"), desc: t("features.f5Desc") },
    { icon: Globe, title: t("features.f6Title"), desc: t("features.f6Desc") },
  ];

  const docs = [
    "Attestation de travail",
    "Attestation de stage",
    "Attestation de poursuite de stage",
    "Contrat de stage",
    "Contrat de travail (CDI)",
    "Contrat de travail (CDD)",
    "Avenant au contrat",
    "Demande de mise à disposition",
    "Solde de tout compte",
    "Certificat de travail",
    "Lettre d'avertissement",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* HERO — dark cinematic */}
      <section className="relative overflow-hidden bg-hero text-white">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="orb h-96 w-96 -top-20 -left-20" style={{ background: "oklch(0.82 0.15 205)" }} />
        <div className="orb h-96 w-96 -bottom-20 -right-20" style={{ background: "oklch(0.55 0.22 295)" }} />

        {/* Nav */}
        <header className="relative z-10 border-b border-white/10">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <Link to="/" className="flex items-center gap-2">
              <BrandLogo size="md" />
            </Link>
            <nav className="hidden items-center gap-8 md:flex">
              <a href="#features" className="text-sm text-white/70 transition hover:text-primary">
                {t("nav.features")}
              </a>
              <a href="#documents" className="text-sm text-white/70 transition hover:text-primary">
                {t("nav.documents")}
              </a>
            </nav>
            <div className="flex items-center gap-2">
              <LangSwitcher />
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-primary">
                  {t("nav.login")}
                </Button>
              </Link>
              <Link to="/login">
                <Button size="sm" className="bg-cyber text-white shadow-glow-cyan hover:opacity-90">
                  {t("nav.getStarted")}
                  <ArrowRight className="ms-2 h-4 w-4 rtl-flip" />
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero content */}
        <div className="container relative z-10 mx-auto px-4 py-20 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-4xl text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              {t("hero.badge")}
            </div>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
              {t("hero.title")}{" "}
              <span className="text-cyber">{t("hero.titleAccent")}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70 md:text-xl">
              {t("hero.subtitle")}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/login">
                <Button size="lg" className="bg-cyber px-8 text-white shadow-glow-cyan hover:opacity-90">
                  {t("hero.ctaPrimary")}
                  <ArrowRight className="ms-2 h-5 w-5 rtl-flip" />
                </Button>
              </Link>
              <a href="#documents">
                <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-primary">
                  {t("hero.ctaSecondary")}
                </Button>
              </a>
            </div>

            {/* Stats */}
            <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                { num: "11", label: t("hero.stat1Label") },
                { num: t("hero.stat2"), label: t("hero.stat2Label") },
                { num: t("hero.stat3"), label: t("hero.stat3Label") },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
                >
                  <div className="text-3xl font-bold text-cyber">{s.num}</div>
                  <div className="mt-1 text-sm text-white/60">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES — light */}
      <section id="features" className="bg-background py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
              {t("features.title")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("features.subtitle")}</p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="group rounded-2xl border border-border bg-card p-6 shadow-card transition hover:border-primary/40 hover:shadow-elegant"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cyber text-white shadow-glow-cyan transition group-hover:scale-110">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DOCUMENTS */}
      <section id="documents" className="bg-secondary/30 py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
              {t("documents.title")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("documents.subtitle")}</p>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2">
            {docs.map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
              >
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary" />
                <span className="text-sm font-medium">{d}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-hero py-24 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            {t("cta.title")}
          </h2>
          <p className="mt-4 text-lg text-white/70">{t("cta.subtitle")}</p>
          <div className="mt-8">
            <Link to="/login">
              <Button size="lg" className="bg-cyber px-8 text-white shadow-glow-cyan hover:opacity-90">
                {t("cta.button")}
                <ArrowRight className="ms-2 h-5 w-5 rtl-flip" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" />
            <span className="text-sm text-muted-foreground">{t("footer.tagline")}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} TYTHON. {t("footer.rights")}
          </p>
        </div>
      </footer>
    </div>
  );
}
