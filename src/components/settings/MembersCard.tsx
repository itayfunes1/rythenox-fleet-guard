import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Trash2, Loader2 } from "lucide-react";
import { useTenantMembers, TenantMember } from "@/hooks/use-tenant-members";
import { useRemoveMember, useAddMember } from "@/hooks/use-member-management";
import { useToast } from "@/hooks/use-toast";

interface MembersCardProps {
  tenantId: string | undefined;
  currentUserId: string | undefined;
}

export default function MembersCard({ tenantId, currentUserId }: MembersCardProps) {
  const { data: members, isLoading } = useTenantMembers(tenantId);
  const removeMember = useRemoveMember();
  const addMember = useAddMember();
  const { toast } = useToast();
  const [addEmail, setAddEmail] = useState("");

  const handleRemove = (member: TenantMember) => {
    removeMember.mutate(member.id, {
      onSuccess: () => toast({ title: "Removed", description: "Member has been removed from the organization." }),
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const handleAdd = () => {
    const email = addEmail.trim();
    if (!email) return;
    addMember.mutate(email, {
      onSuccess: () => {
        toast({ title: "Added", description: `${email} has been added to the organization.` });
        setAddEmail("");
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <Card className="glass-card glow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          Organization Members
        </CardTitle>
        <CardDescription>Manage who has access to your organization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add member */}
        <div className="flex gap-2">
          <Input
            placeholder="Add member by email..."
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="bg-muted/30 border-border/50 focus:border-primary"
          />
          <Button
            onClick={handleAdd}
            disabled={addMember.isPending || !addEmail.trim()}
            className="shrink-0"
          >
            {addMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
            Add
          </Button>
        </div>

        {/* Member list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-muted/30 shimmer" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {(members || []).map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-muted/20">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground font-mono">{member.user_id.slice(0, 12)}...</p>
                    <p className="text-xs text-muted-foreground">Joined {new Date(member.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      member.role === "owner"
                        ? "bg-primary/10 text-primary border-primary/20 text-[10px]"
                        : member.role === "admin"
                        ? "bg-warning/10 text-warning border-warning/20 text-[10px]"
                        : "bg-muted/30 text-muted-foreground border-border/30 text-[10px]"
                    }
                  >
                    {member.role}
                  </Badge>
                  {member.role !== "owner" && member.user_id !== currentUserId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10 h-7 px-2"
                      onClick={() => handleRemove(member)}
                      disabled={removeMember.isPending}
                    >
                      {removeMember.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {(!members || members.length === 0) && (
              <p className="text-sm text-muted-foreground">No members found.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
