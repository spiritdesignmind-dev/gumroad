import cx from "classnames";
import * as React from "react";

export const Tabs = ({ children, ...props }: { children: React.ReactNode } & React.HTMLProps<HTMLDivElement>) => (
  <div role="tablist" className="flex gap-3" {...props}>
    {children}
  </div>
);

export const Tab = ({
  children,
  isSelected,
  ...props
}: { children: React.ReactNode; isSelected: boolean } & React.HTMLProps<HTMLAnchorElement>) => (
  <a
    className={cx(
      "shrink-0 rounded-full px-3 py-2 no-underline",
      isSelected && "border border-border bg-background text-foreground",
    )}
    role="tab"
    aria-selected={isSelected}
    {...props}
  >
    {children}
  </a>
);
