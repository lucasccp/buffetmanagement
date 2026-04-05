import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Mail, Lock, Eye, EyeClosed, ArrowRight, Sun, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { useTheme } from "@/hooks/use-theme";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
  const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos"
          : error.message);
      } else {
        navigate("/dashboard");
      }
    } catch {
      toast.error("Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden relative bg-background">

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-card/60 backdrop-blur border border-border text-muted-foreground hover:text-foreground transition-colors"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-[120px]"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15 blur-[100px]"
          style={{ background: "radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)" }} />
      </div>

      {/* Animated glow spots */}
      <motion.div
        animate={{ x: [0, 50, -30, 0], y: [0, -40, 20, 0], scale: [1, 1.2, 0.9, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/3 right-1/3 w-64 h-64 rounded-full opacity-10 blur-[80px]"
        style={{ background: "hsl(var(--primary))" }}
      />
      <motion.div
        animate={{ x: [0, -60, 40, 0], y: [0, 30, -50, 0], scale: [1, 0.8, 1.1, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-1/3 left-1/3 w-72 h-72 rounded-full opacity-10 blur-[90px]"
        style={{ background: "hsl(var(--accent))" }}
      />

      <div className="relative z-10 w-full max-w-md mx-4" style={{ perspective: "1200px" }}>
        <motion.div
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          transition={{ type: "spring", stiffness: 100, damping: 30 }}
        >
          {/* Card glow border */}
          <div className="absolute -inset-[1px] rounded-2xl overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
            <motion.div
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
              className="absolute top-0 left-0 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-foreground/20 to-transparent"
            />
            <motion.div
              animate={{ y: ["-100%", "200%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 3, delay: 1 }}
              className="absolute top-0 right-0 w-[1px] h-1/3 bg-gradient-to-b from-transparent via-foreground/20 to-transparent"
            />
            <motion.div
              animate={{ x: ["200%", "-100%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 2, delay: 2 }}
              className="absolute bottom-0 left-0 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-foreground/20 to-transparent"
            />
            <motion.div
              animate={{ y: ["200%", "-100%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 3, delay: 3 }}
              className="absolute top-0 left-0 w-[1px] h-1/3 bg-gradient-to-b from-transparent via-foreground/20 to-transparent"
            />
          </div>

          {/* Glass card */}
          <div className="relative rounded-2xl p-8 backdrop-blur-xl border border-border bg-card/80">

            {/* Logo and header */}
            <div className="text-center mb-8">
              <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 overflow-hidden"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}>
                <span className="text-2xl font-bold text-primary-foreground">B</span>
                <div className="absolute inset-0 bg-gradient-to-b from-foreground/10 to-transparent" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-1">Bem-vindo de volta</h1>
              <p className="text-sm text-muted-foreground">Entre para acessar o BuffetPro</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedInput("email")}
                    onBlur={() => setFocusedInput(null)}
                    required
                    className="w-full bg-input border border-transparent focus:border-ring text-foreground placeholder:text-muted-foreground h-10 rounded-lg pl-10 pr-3 text-sm outline-none transition-all duration-300 focus:bg-input/80"
                  />
                  {focusedInput === "email" && (
                    <motion.div layoutId="input-glow" className="absolute -inset-[1px] rounded-lg border border-ring/50 pointer-events-none" />
                  )}
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedInput("password")}
                    onBlur={() => setFocusedInput(null)}
                    required
                    className="w-full bg-input border border-transparent focus:border-ring text-foreground placeholder:text-muted-foreground h-10 rounded-lg pl-10 pr-10 text-sm outline-none transition-all duration-300 focus:bg-input/80"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeClosed className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  {focusedInput === "password" && (
                    <motion.div layoutId="input-glow" className="absolute -inset-[1px] rounded-lg border border-ring/50 pointer-events-none" />
                  )}
                </div>
              </div>

              {/* Remember me & Forgot password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={() => setRememberMe(!rememberMe)}
                      className="appearance-none h-4 w-4 rounded border border-border bg-input checked:bg-primary checked:border-primary focus:outline-none transition-all duration-200"
                    />
                    {rememberMe && (
                      <svg className="absolute inset-0 w-4 h-4 text-primary-foreground pointer-events-none" viewBox="0 0 16 16">
                        <path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">Lembrar-me</span>
                </label>
                <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Esqueceu a senha?
                </Link>
              </div>

              {/* Submit button */}
              <div className="relative group">
                <div className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }} />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="relative w-full h-11 rounded-xl text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 transition-all duration-300 overflow-hidden"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      Entrar
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">ou</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Google button */}
              <button
                type="button"
                disabled={isGoogleLoading}
                onClick={async () => {
                  setIsGoogleLoading(true);
                  try {
                    const result = await lovable.auth.signInWithOAuth("google", {
                      redirect_uri: window.location.origin,
                    });
                    if (result.error) {
                      toast.error("Erro ao entrar com Google");
                      return;
                    }
                    if (result.redirected) return;
                    navigate("/dashboard");
                  } catch {
                    toast.error("Erro ao entrar com Google");
                  } finally {
                    setIsGoogleLoading(false);
                  }
                }}
                className="relative w-full h-11 rounded-xl bg-secondary border border-border text-secondary-foreground font-medium text-sm flex items-center justify-center gap-3 hover:bg-secondary/80 transition-all duration-300"
              >
                {isGoogleLoading ? (
                  <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Entrar com Google
                  </>
                )}
              </button>
            </form>

            {/* Sign up link */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              Não tem uma conta?{" "}
              <Link to="/register" className="text-foreground hover:text-primary transition-colors font-medium">
                Cadastre-se
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
