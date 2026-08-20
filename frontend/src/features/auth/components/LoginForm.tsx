"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/shared/api/axios";
import { useAuthStore } from "@/shared/store/auth.store";
import { useRouter } from "next/navigation";
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  Sparkles,
  Building2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().min(1, { message: "Email address is required." }).email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const login = useAuthStore((state) => state.login);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setError(null);
    try {
      const response = await api.post("/auth/login", data);
      const { user, accessToken } = response.data.data;
      
      login(user, accessToken);
      router.push("/");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Invalid credentials or server unavailable. Please try again."
      );
    }
  }

  const fillDemoCredentials = () => {
    setValue("email", "admin@fastigo.com", { shouldValidate: true });
    setValue("password", "Admin@12345", { shouldValidate: true });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Outer Card Container with modern glass and glow effect */}
      <div className="relative rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl shadow-slate-900/10 p-8 sm:p-10 transition-all duration-300">
        
        {/* Subtle Top Accent Glow Line */}
        <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-full" />

        {/* Brand / Logo Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-4 ring-4 ring-indigo-50">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold tracking-wide uppercase mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Fastigo ERP Suite
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sign in to access your enterprise workspace
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50/90 border border-red-200 text-red-700 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs sm:text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email Field */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Email Address
            </Label>
            <div className="relative rounded-lg shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                className="pl-10 h-11 bg-slate-50/70 border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500/20 transition-all text-sm rounded-xl"
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field with Show/Hide Toggle */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </Label>
              <button
                type="button"
                tabIndex={-1}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
                onClick={() => {
                  setError("Please contact your IT administrator to reset your enterprise credentials.");
                }}
              >
                Forgot password?
              </button>
            </div>
            <div className="relative rounded-lg shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="pl-10 pr-11 h-11 bg-slate-50/70 border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500/20 transition-all text-sm rounded-xl"
                {...register("password")}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none focus:text-indigo-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-slate-500 hover:text-slate-800" />
                ) : (
                  <Eye className="w-4 h-4 text-slate-500 hover:text-slate-800" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Remember me & Quick Fill Demo option */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-600">Remember this device</span>
            </label>

            <button
              type="button"
              onClick={fillDemoCredentials}
              className="text-xs font-semibold text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-2.5 py-1 rounded-md transition-colors border border-slate-200"
            >
              Demo Fill
            </button>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign in to Dashboard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </Button>
        </form>

        {/* Security Trust Badge Footer */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>256-bit SSL Secure Enterprise Portal</span>
        </div>
      </div>

      {/* Auxiliary Help info below card */}
      <p className="mt-6 text-center text-xs text-slate-400">
        Fastigo ERP &copy; {new Date().getFullYear()} &bull; Enterprise Operations Management
      </p>
    </div>
  );
}
