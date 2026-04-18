import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { BrandLogo } from "@/components/brand-logo";
import { LangSwitcher } from "@/components/lang-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Connexion — YODABOT" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const { signIn, signUp, session, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: "/app" });
    }
  }, [session, loading, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error(t("auth.emailRequired"));
    if (password.length < 6) return toast.error(t("auth.passwordMin"));
    if (mode === "signup" && !fullName) return toast.error(t("auth.nameRequired"));

    setSubmitting(true);
    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) toast.error(error);
        else {
          toast.success(t("auth.success"));
          navigate({ to: "/app" });
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) toast.error(error);
        else {
          toast.success(t("auth.signupSuccess"));
          navigate({ to: "/app" });
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-hero">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="orb h-[500px] w-[500px] -top-40 -right-40" style={{ background: "oklch(0.82 0.15 205)" }} />
      <div className="orb h-[400px] w-[400px] -bottom-20 -left-20" style={{ background: "oklch(0.55 0.22 295)" }} />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-2 text-white/80 hover:text-primary">
            <ArrowLeft className="h-4 w-4 rtl-flip" />
            <span className="text-sm">{t("common.back")}</span>
          </Link>
          <LangSwitcher />
        </header>

        <main className="flex flex-1 items-center justify-center p-4">
          <Card className="w-full max-w-md border-white/10 bg-card/95 p-8 shadow-elegant backdrop-blur-xl">
            <div className="mb-6 text-center">
              <BrandLogo size="lg" className="mx-auto mb-4" />
              <h1 className="font-display text-2xl font-bold">
                {mode === "login" ? t("auth.loginTitle") : t("auth.signupTitle")}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "login" ? t("auth.loginSubtitle") : t("auth.signupSubtitle")}
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">{t("auth.fullName")}</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Hassan El Mansouri"
                    autoComplete="name"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rh@tython.ma"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </div>

              <Button type="submit" className="w-full bg-cyber text-white shadow-glow-cyan" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {mode === "login" ? t("auth.loggingIn") : t("auth.creating")}
                  </>
                ) : mode === "login" ? (
                  t("auth.login")
                ) : (
                  t("auth.signup")
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="font-medium text-primary hover:underline"
              >
                {mode === "login" ? t("auth.signUpHere") : t("auth.signInHere")}
              </button>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
