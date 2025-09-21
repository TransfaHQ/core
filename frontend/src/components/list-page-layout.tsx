import type { ReactNode } from "react";

interface ListPageLayoutProps {
  title: string;
  description: string;
  actionButton?: ReactNode;
  children: ReactNode;
}

export function ListPageLayout({ title, description, actionButton, children }: ListPageLayoutProps) {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6 w-full">
      {/* Page Header */}
      <div className="flex items-center justify-between w-full">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        {actionButton}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}