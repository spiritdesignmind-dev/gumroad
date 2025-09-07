import cx from "classnames";
import * as React from "react";

export const PageHeader = ({
  title,
  actions,
  children,
  className,
}: {
  title: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) => (
  <header className={cx("flex flex-col gap-4 border-b border-border p-8", className)}>
    <div className="flex items-center justify-between">
      <h1 className="hidden text-2xl md:block">{title}</h1>
      <div className="-my-2 flex gap-2">{actions}</div>
    </div>
    {children}
  </header>
);
