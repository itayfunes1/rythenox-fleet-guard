import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, LogOut } from "lucide-react";
import { toast } from "sonner";

/**
 * Renders a 2FA challenge gate when the current session is AAL1 but the user
 * has a verified TOTP factor (AAL2 required). Children are rendered otherwise.
 */
export function TwoFactorGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "ok" | "needs-2fa">("checking");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const check = async () => {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) { setStatus("ok"); return; }
    if (data.currentLevel === "aal1" && data.nextLevel === "aal2") {
      const { data: f } = await supabase.auth.mfa.listFactors();
      const verified = f?.totp?.find((x) => x.status === "verified");
      if (verified) {
        setFactorId(verified.id);
        setStatus("needs-2fa");
        return;
      }
    }
    setStatus("ok");
  };

  useEffect(() => {
    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => check());
    return () => subscription.unsubscribe();
  }, []);

  const verify = async () => {
    if (!factorId || code.length < 6) return;
    setSubmitting(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setCode("");
    await check();
  };

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "needs-2fa") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Two-factor required</CardTitle>
            <CardDescription>Enter the 6-digit code from your authenticator app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && verify()}
                inputMode="numeric"
                placeholder="123456"
                className="font-mono text-center text-lg tracking-widest"
              />
            </div>
            <Button className="w-full" onClick={verify} disabled={code.length < 6 || submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Verify
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => supabase.auth.signOut()}>
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
