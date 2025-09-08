import * as React from "react";

import { classNames } from "$app/utils/classNames";

export const PageHeader = React.forwardRef<
  HTMLDivElement,
  {
    title: React.ReactNode;
    actions?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
  }
>(({ title, actions, children, className }, ref) => (
  <header className={classNames("flex flex-col gap-4 border-b border-border p-8", className)} ref={ref}>
    <div className="flex items-center justify-between">
      <h1 className="hidden text-2xl md:block">{title}</h1>
      <div className="-my-2 flex gap-2">{actions}</div>
    </div>
    {children}
  </header>
));

PageHeader.displayName = "PageHeader";
