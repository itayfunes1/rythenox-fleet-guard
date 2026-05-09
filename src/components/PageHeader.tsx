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
    <div className="panel-accent">
      <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 p-5 sm:p-7 pt-7 sm:pt-9">
        <div className="flex items-start gap-4 min-w-0">
          {icon && (
            <div className="shrink-0 h-12 w-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md ring-1 ring-primary/10">
              {icon}
            </div>
          )}
          <div className="space-y-2 min-w-0">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h1 className="text-3xl sm:text-[34px] font-extrabold tracking-tight text-foreground leading-[1.05]">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}
