import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Zap } from "lucide-react";

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

  const AuthCard = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="floating-orb w-96 h-96 bg-primary/30 -top-48 -left-48" style={{ animationDelay: '0s' }} />
      <div className="floating-orb w-80 h-80 bg-[hsl(260,67%,60%)] -bottom-40 -right-40" style={{ animationDelay: '3s' }} />
      <div className="floating-orb w-64 h-64 bg-success/20 top-1/4 right-1/4" style={{ animationDelay: '6s' }} />

      <Card className="w-full max-w-md glass-card border-border/30 animate-scale-in relative z-10">
        {children}
      </Card>
    </div>
  );

  if (resetMode) {
    return (
      <AuthCard>
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
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
              <Label className="text-sm font-medium">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-muted/50 border-border/50 focus:border-primary transition-colors" />
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-[hsl(260,67%,60%)] hover:opacity-90 transition-opacity shadow-lg shadow-primary/20" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
            <Button type="button" variant="ghost" className="w-full text-muted-foreground hover:text-foreground" onClick={() => setResetMode(false)}>
              Back to login
            </Button>
          </form>
        </CardContent>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <CardHeader className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[hsl(260,67%,60%)] shadow-lg shadow-primary/30">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>
        <div>
          <CardTitle className="text-xl font-bold tracking-tight">Rythenox</CardTitle>
          <CardDescription className="text-muted-foreground">IT Fleet Management & Helpdesk Portal</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50">
            <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Login</TabsTrigger>
            <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-muted/50 border-border/50 focus:border-primary transition-colors" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-muted/50 border-border/50 focus:border-primary transition-colors" />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-primary to-[hsl(260,67%,60%)] hover:opacity-90 transition-opacity shadow-lg shadow-primary/20" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              <Button type="button" variant="link" className="w-full text-sm text-muted-foreground hover:text-primary" onClick={() => setResetMode(true)}>
                Forgot password?
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="bg-muted/50 border-border/50 focus:border-primary transition-colors" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-muted/50 border-border/50 focus:border-primary transition-colors" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="bg-muted/50 border-border/50 focus:border-primary transition-colors" />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-primary to-[hsl(260,67%,60%)] hover:opacity-90 transition-opacity shadow-lg shadow-primary/20" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </AuthCard>
  );
}
