import * as React from "react";

export const PageHeader = ({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) => (
  <header className="flex flex-col gap-4 border-b border-border p-8">
    <div className="flex items-center justify-between">
      <h1 className="hidden text-2xl md:block">{title}</h1>
      <div className="-my-2 flex gap-2">{actions}</div>
    </div>
    {children}
  </header>
);
