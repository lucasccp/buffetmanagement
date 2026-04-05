import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Mail, Lock, Eye, EyeClosed, ArrowRight, UserPlus, Sun, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { useTheme } from "@/hooks/use-theme";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
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
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Cadastro realizado! Verifique seu e-mail para confirmar a conta.");
        navigate("/login");
      }
    } catch {
      toast.error("Erro ao cadastrar");
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

      <motion.div
        animate={{ x: [0, 50, -30, 0], y: [0, -40, 20, 0], scale: [1, 1.2, 0.9, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/3 right-1/3 w-64 h-64 rounded-full opacity-10 blur-[80px]"
        style={{ background: "hsl(var(--primary))" }}
      />

      <div className="relative z-10 w-full max-w-md mx-4" style={{ perspective: "1200px" }}>
        <motion.div
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          transition={{ type: "spring", stiffness: 100, damping: 30 }}
        >
          {/* Card glow border */}
          <div className="absolute -inset-[1px] rounded-2xl overflow-hidden">
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
          </div>

          {/* Glass card */}
          <div className="relative rounded-2xl p-8 backdrop-blur-xl border border-border bg-card/80">

            {/* Logo and header */}
            <div className="text-center mb-8">
              <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 overflow-hidden"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}>
                <UserPlus className="h-7 w-7 text-primary-foreground" />
                <div className="absolute inset-0 bg-gradient-to-b from-foreground/10 to-transparent" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-1">Criar conta</h1>
              <p className="text-sm text-muted-foreground">Cadastre-se no BuffetPro</p>
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
                    <motion.div layoutId="input-glow-reg" className="absolute -inset-[1px] rounded-lg border border-ring/50 pointer-events-none" />
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
                    placeholder="Mínimo 6 caracteres"
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
                    <motion.div layoutId="input-glow-reg" className="absolute -inset-[1px] rounded-lg border border-ring/50 pointer-events-none" />
                  )}
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirmar senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setFocusedInput("confirm")}
                    onBlur={() => setFocusedInput(null)}
                    required
                    className="w-full bg-input border border-transparent focus:border-ring text-foreground placeholder:text-muted-foreground h-10 rounded-lg pl-10 pr-3 text-sm outline-none transition-all duration-300 focus:bg-input/80"
                  />
                  {focusedInput === "confirm" && (
                    <motion.div layoutId="input-glow-reg" className="absolute -inset-[1px] rounded-lg border border-ring/50 pointer-events-none" />
                  )}
                </div>
              </div>

              {/* Submit button */}
              <div className="relative group pt-2">
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
                      Cadastrar
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Login link */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              Já tem uma conta?{" "}
              <Link to="/login" className="text-foreground hover:text-primary transition-colors font-medium">
                Entrar
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
