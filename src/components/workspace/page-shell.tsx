import { ReactNode } from "react";

interface PageShellProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function PageShell({ title, subtitle, action, children }: PageShellProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </header>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
