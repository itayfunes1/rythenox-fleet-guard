import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Factor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
}

export function TwoFactorCard() {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) toast.error(error.message);
    else setFactors([...(data?.totp || [])] as Factor[]);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const verified = factors.find((f) => f.status === "verified");

  const startEnroll = async () => {
    setEnrolling(true);
    // Clean any unverified factor first to avoid friendly-name conflicts
    const stale = factors.find((f) => f.status !== "verified");
    if (stale) await supabase.auth.mfa.unenroll({ factorId: stale.id });

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Authenticator ${new Date().toISOString()}`,
    });
    setEnrolling(false);
    if (error) return toast.error(error.message);
    setEnrollData({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const verifyEnroll = async () => {
    if (!enrollData || code.length < 6) return;
    setVerifying(true);
    const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId: enrollData.factorId });
    if (cErr) { setVerifying(false); return toast.error(cErr.message); }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: enrollData.factorId,
      challengeId: ch.id,
      code: code.trim(),
    });
    setVerifying(false);
    if (vErr) return toast.error(vErr.message);
    toast.success("Two-factor authentication enabled");
    setEnrollData(null);
    setCode("");
    await refresh();
  };

  const cancelEnroll = async () => {
    if (enrollData) await supabase.auth.mfa.unenroll({ factorId: enrollData.factorId });
    setEnrollData(null);
    setCode("");
    await refresh();
  };

  const removeFactor = async (id: string) => {
    if (!confirm("Disable two-factor authentication?")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) return toast.error(error.message);
    toast.success("Two-factor authentication disabled");
    await refresh();
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            {verified ? <ShieldCheck className="h-4 w-4 text-primary" /> : <ShieldOff className="h-4 w-4 text-muted-foreground" />}
          </div>
          Two-factor authentication
          {verified && <Badge variant="secondary" className="ml-2">Enabled</Badge>}
        </CardTitle>
        <CardDescription>
          Add an authenticator app (Google Authenticator, 1Password, Authy) for an extra sign-in step.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : verified ? (
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-3">
            <div>
              <p className="text-sm font-semibold">Authenticator app</p>
              <p className="text-xs text-muted-foreground">Active since enrollment.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => removeFactor(verified.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ) : enrollData ? (
          <div className="space-y-3">
            <p className="text-sm">Scan this QR code with your authenticator app, then enter the 6-digit code.</p>
            <div className="flex justify-center rounded-lg border border-border/50 bg-white p-4">
              <img src={enrollData.qr} alt="2FA QR code" className="h-44 w-44" />
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Or enter this secret manually:</p>
              <code className="text-xs font-mono bg-muted/40 px-2 py-1 rounded">{enrollData.secret}</code>
            </div>
            <div className="space-y-2">
              <Label>6-digit code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                inputMode="numeric"
                className="font-mono text-center text-lg tracking-widest"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={verifyEnroll} disabled={code.length < 6 || verifying}>
                {verifying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Verify & enable
              </Button>
              <Button variant="ghost" onClick={cancelEnroll}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button onClick={startEnroll} disabled={enrolling}>
            {enrolling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enable two-factor authentication
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
