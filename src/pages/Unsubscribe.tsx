import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "loading" | "valid" | "already" | "invalid" | "submitting" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.valid) {
          setEmail(data.email ?? "");
          setState(data.alreadyUnsubscribed ? "already" : "valid");
        } else {
          setState("invalid");
          setErrorMsg(data?.error ?? "Invalid or expired link");
        }
      } catch {
        setState("error");
        setErrorMsg("Network error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    setState("submitting");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error || !data?.success) {
        setState("error");
        setErrorMsg(error?.message ?? "Failed to unsubscribe");
        return;
      }
      setState("done");
    } catch (e: any) {
      setState("error");
      setErrorMsg(e?.message ?? "Failed to unsubscribe");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Email preferences</CardTitle>
          <CardDescription>Manage your email subscription</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === "loading" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Validating link…
            </div>
          )}
          {state === "valid" && (
            <>
              <p className="text-sm text-foreground">
                Unsubscribe <span className="font-medium">{email}</span> from notification emails?
              </p>
              <Button onClick={confirm} className="w-full">Confirm Unsubscribe</Button>
            </>
          )}
          {state === "submitting" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Processing…
            </div>
          )}
          {(state === "done" || state === "already") && (
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">
                  {state === "done" ? "You've been unsubscribed." : "You're already unsubscribed."}
                </p>
                {email && <p className="text-muted-foreground">{email}</p>}
              </div>
            </div>
          )}
          {(state === "invalid" || state === "error") && (
            <div className="flex items-start gap-2 text-sm">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium">Something went wrong</p>
                <p className="text-muted-foreground">{errorMsg || "Invalid link"}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
