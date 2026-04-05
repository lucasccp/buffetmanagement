import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Mail, Lock, Eye, EyeClosed, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
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
    <div className="min-h-screen flex items-center justify-center overflow-hidden relative"
      style={{ background: "linear-gradient(135deg, #0f0a1a 0%, #1a1035 30%, #12081f 60%, #0a0612 100%)" }}>

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
          <div className="absolute -inset-[1px] rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            {/* Traveling light beams */}
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
            <motion.div
              animate={{ x: ["200%", "-100%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 2, delay: 2 }}
              className="absolute bottom-0 left-0 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"
            />
            <motion.div
              animate={{ y: ["200%", "-100%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 3, delay: 3 }}
              className="absolute top-0 left-0 w-[1px] h-1/3 bg-gradient-to-b from-transparent via-white/30 to-transparent"
            />
          </div>

          {/* Glass card */}
          <div className="relative rounded-2xl p-8 backdrop-blur-xl border border-white/[0.08]"
            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)" }}>

            {/* Logo and header */}
            <div className="text-center mb-8">
              <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 overflow-hidden"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}>
                <span className="text-2xl font-bold text-white">B</span>
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">Bem-vindo de volta</h1>
              <p className="text-sm text-white/40">Entre para acessar o BuffetPro</p>
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
                    <motion.div layoutId="input-glow" className="absolute -inset-[1px] rounded-lg border border-white/20 pointer-events-none" />
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
                    placeholder="••••••••"
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
                    <motion.div layoutId="input-glow" className="absolute -inset-[1px] rounded-lg border border-white/20 pointer-events-none" />
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
                      className="appearance-none h-4 w-4 rounded border border-white/20 bg-white/5 checked:bg-white checked:border-white focus:outline-none transition-all duration-200"
                    />
                    {rememberMe && (
                      <svg className="absolute inset-0 w-4 h-4 text-black pointer-events-none" viewBox="0 0 16 16">
                        <path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-white/40">Lembrar-me</span>
                </label>
                <Link to="/login" className="text-xs text-white/40 hover:text-white/70 transition-colors">
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
                  className="relative w-full h-11 rounded-xl text-white font-medium text-sm flex items-center justify-center gap-2 transition-all duration-300 overflow-hidden"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-white/30">ou</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Google button placeholder */}
              <button
                type="button"
                className="relative w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white/70 font-medium text-sm flex items-center justify-center gap-3 hover:bg-white/10 transition-all duration-300"
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">G</span>
                Entrar com Google
              </button>
            </form>

            {/* Sign up link */}
            <p className="text-center text-sm text-white/30 mt-6">
              Não tem uma conta?{" "}
              <Link to="/register" className="text-white/70 hover:text-white transition-colors font-medium">
                Cadastre-se
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
