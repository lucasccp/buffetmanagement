import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Mail, Lock, Eye, EyeClosed, ArrowRight, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const navigate = useNavigate();

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
    <div className="min-h-screen flex items-center justify-center overflow-hidden relative"
      style={{ background: "linear-gradient(135deg, #0f0a1a 0%, #1a1035 30%, #12081f 60%, #0a0612 100%)" }}>

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
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <motion.div
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
              className="absolute top-0 left-0 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"
            />
            <motion.div
              animate={{ y: ["-100%", "200%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 3, delay: 1 }}
              className="absolute top-0 right-0 w-[1px] h-1/3 bg-gradient-to-b from-transparent via-white/30 to-transparent"
            />
          </div>

          {/* Glass card */}
          <div className="relative rounded-2xl p-8 backdrop-blur-xl border border-white/[0.08]"
            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)" }}>

            {/* Logo and header */}
            <div className="text-center mb-8">
              <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 overflow-hidden"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}>
                <UserPlus className="h-7 w-7 text-white" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">Criar conta</h1>
              <p className="text-sm text-white/40">Cadastre-se no BuffetPro</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/50 uppercase tracking-wider">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedInput("email")}
                    onBlur={() => setFocusedInput(null)}
                    required
                    className="w-full bg-white/5 border border-transparent focus:border-white/20 text-white placeholder:text-white/30 h-10 rounded-lg pl-10 pr-3 text-sm outline-none transition-all duration-300 focus:bg-white/10"
                  />
                  {focusedInput === "email" && (
                    <motion.div layoutId="input-glow-reg" className="absolute -inset-[1px] rounded-lg border border-white/20 pointer-events-none" />
                  )}
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedInput("password")}
                    onBlur={() => setFocusedInput(null)}
                    required
                    className="w-full bg-white/5 border border-transparent focus:border-white/20 text-white placeholder:text-white/30 h-10 rounded-lg pl-10 pr-10 text-sm outline-none transition-all duration-300 focus:bg-white/10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPassword ? <EyeClosed className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  {focusedInput === "password" && (
                    <motion.div layoutId="input-glow-reg" className="absolute -inset-[1px] rounded-lg border border-white/20 pointer-events-none" />
                  )}
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Confirmar senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setFocusedInput("confirm")}
                    onBlur={() => setFocusedInput(null)}
                    required
                    className="w-full bg-white/5 border border-transparent focus:border-white/20 text-white placeholder:text-white/30 h-10 rounded-lg pl-10 pr-3 text-sm outline-none transition-all duration-300 focus:bg-white/10"
                  />
                  {focusedInput === "confirm" && (
                    <motion.div layoutId="input-glow-reg" className="absolute -inset-[1px] rounded-lg border border-white/20 pointer-events-none" />
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
                  className="relative w-full h-11 rounded-xl text-white font-medium text-sm flex items-center justify-center gap-2 transition-all duration-300 overflow-hidden"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
            <p className="text-center text-sm text-white/30 mt-6">
              Já tem uma conta?{" "}
              <Link to="/login" className="text-white/70 hover:text-white transition-colors font-medium">
                Entrar
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
