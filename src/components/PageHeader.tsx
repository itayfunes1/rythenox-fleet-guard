import { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions, icon }: PageHeaderProps) {
  return (
    <div className="panel-accent overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6">
        <div className="flex items-start gap-4 min-w-0">
          {icon && (
            <div className="shrink-0 h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] text-primary-foreground flex items-center justify-center shadow-md ring-1 ring-primary/20">
              {icon}
            </div>
          )}
          <div className="space-y-1.5 min-w-0">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-foreground leading-tight">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}
