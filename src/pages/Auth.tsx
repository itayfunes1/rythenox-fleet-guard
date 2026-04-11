import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Zap, Mail, Lock, User, Shield, Monitor, Wifi, ArrowLeft } from "lucide-react";

const features = [
  { icon: Monitor, label: "Fleet Management", desc: "Monitor and control all devices" },
  { icon: Wifi, label: "Real-time Monitoring", desc: "Live telemetry and status updates" },
  { icon: Shield, label: "Secure Access", desc: "Enterprise-grade security controls" },
];

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Signup Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent you a confirmation link." });
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
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px] -top-64 -left-64 animate-[float_12s_ease-in-out_infinite]" />
        <div className="absolute w-[500px] h-[500px] rounded-full bg-[hsl(260,67%,60%)]/8 blur-[120px] -bottom-48 -right-48 animate-[float_15s_ease-in-out_infinite_3s]" />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-success/5 blur-[80px] top-1/3 left-1/3 animate-[float_10s_ease-in-out_infinite_6s]" />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />
      </div>

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center p-12 relative z-10">
        <div className="max-w-md space-y-8">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[hsl(260,67%,60%)] shadow-lg shadow-primary/30">
              <Zap className="h-6 w-6 text-primary-foreground" />
              <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-br from-primary/40 to-[hsl(260,67%,60%,0.4)] blur-md -z-10" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Rythenox</h1>
              <p className="text-xs text-muted-foreground tracking-wide uppercase">Fleet Management</p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-foreground leading-tight">
              Command your fleet<br />
              <span className="gradient-text">from anywhere.</span>
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Monitor devices, deploy software, and manage your IT infrastructure with real-time visibility and control.
            </p>
          </div>

          <div className="space-y-4 pt-4">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-3 group">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
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
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <Card className="w-full max-w-md glass-card border-border/30 animate-scale-in shadow-2xl shadow-primary/5">
          {resetMode ? (
            <>
              <CardHeader className="text-center space-y-3 pb-2">
                <div className="flex justify-center lg:hidden">
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[hsl(260,67%,60%)] shadow-lg shadow-primary/30">
                    <Zap className="h-6 w-6 text-primary-foreground" />
                  </div>
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
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10 bg-muted/30 border-border/50 focus:border-primary focus:bg-muted/50 transition-all h-11" placeholder="you@company.com" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 bg-gradient-to-r from-primary to-[hsl(260,67%,60%)] hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 font-medium" disabled={loading}>
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
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[hsl(260,67%,60%)] shadow-lg shadow-primary/30">
                    <Zap className="h-6 w-6 text-primary-foreground" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl font-bold tracking-tight">Welcome back</CardTitle>
                  <CardDescription className="text-muted-foreground text-sm">Sign in to your Rythenox account</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="login" className="space-y-5">
                  <TabsList className="grid w-full grid-cols-2 bg-muted/30 p-1 rounded-xl h-11">
                    <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all text-sm font-medium">Login</TabsTrigger>
                    <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all text-sm font-medium">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="space-y-4 mt-0">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10 bg-muted/30 border-border/50 focus:border-primary focus:bg-muted/50 transition-all h-11" placeholder="you@company.com" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-10 bg-muted/30 border-border/50 focus:border-primary focus:bg-muted/50 transition-all h-11" placeholder="••••••••" />
                        </div>
                      </div>
                      <Button type="submit" className="w-full h-11 bg-gradient-to-r from-primary to-[hsl(260,67%,60%)] hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 font-medium" disabled={loading}>
                        {loading ? "Signing in..." : "Sign In"}
                      </Button>
                      <Button type="button" variant="link" className="w-full text-xs text-muted-foreground hover:text-primary" onClick={() => setResetMode(true)}>
                        Forgot password?
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="space-y-4 mt-0">
                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="pl-10 bg-muted/30 border-border/50 focus:border-primary focus:bg-muted/50 transition-all h-11" placeholder="John Doe" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10 bg-muted/30 border-border/50 focus:border-primary focus:bg-muted/50 transition-all h-11" placeholder="you@company.com" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="pl-10 bg-muted/30 border-border/50 focus:border-primary focus:bg-muted/50 transition-all h-11" placeholder="••••••••" />
                        </div>
                      </div>
                      <Button type="submit" className="w-full h-11 bg-gradient-to-r from-primary to-[hsl(260,67%,60%)] hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 font-medium" disabled={loading}>
                        {loading ? "Creating account..." : "Create Account"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
