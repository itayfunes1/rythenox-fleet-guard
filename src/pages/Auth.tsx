import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, Shield, Monitor, Wifi, ArrowLeft } from "lucide-react";
import rythenoxLogo from "@/assets/rythenox-logo.svg";

const features = [
  { icon: Monitor, label: "Personal Fleet", desc: "Your own devices, your own API key" },
  { icon: Wifi, label: "Real-time Monitoring", desc: "Live telemetry and status updates" },
  { icon: Shield, label: "Secure Access", desc: "Private workspace per account" },
];

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "Password reset link sent." });
      setResetMode(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center p-12 bg-muted/30 border-r border-border">
        <div className="max-w-md space-y-8">
          <div className="flex flex-col gap-2 items-start">
            <img src={rythenoxLogo} alt="Rythenox" className="h-12 w-auto" />
            <p className="text-xs text-muted-foreground tracking-wide uppercase pl-1">Marengo Dashboard</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-foreground leading-tight">
              Command your fleet<br />
              <span className="text-primary">from anywhere.</span>
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Monitor devices, deploy software, and manage your IT infrastructure with real-time visibility and control.
            </p>
          </div>

          <div className="space-y-4 pt-4">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-3 group">
                <div className="h-10 w-10 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center text-primary group-hover:bg-primary/12 transition-colors">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md border border-border shadow-sm animate-scale-in">
          {resetMode ? (
            <>
              <CardHeader className="text-center space-y-3 pb-2">
                <div className="flex justify-center lg:hidden">
                  <img src={rythenoxLogo} alt="Rythenox" className="h-10 w-auto" />
                </div>
                <CardTitle className="text-xl font-bold">Reset Password</CardTitle>
                <CardDescription>Enter your email to receive a reset link</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10 h-11" placeholder="you@company.com" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full text-muted-foreground hover:text-foreground text-sm" onClick={() => setResetMode(false)}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to login
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center space-y-3 pb-2">
                <div className="flex justify-center lg:hidden">
                  <img src={rythenoxLogo} alt="Rythenox" className="h-10 w-auto" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold tracking-tight">Welcome back</CardTitle>
                  <CardDescription className="text-muted-foreground text-sm">Sign in to your Rythenox account</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10 h-11" placeholder="you@company.com" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-10 h-11" placeholder="••••••••" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                  <Button type="button" variant="link" className="w-full text-xs text-muted-foreground hover:text-primary" onClick={() => setResetMode(true)}>
                    Forgot password?
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
