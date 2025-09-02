import cx from "classnames";
import * as React from "react";

export const Tabs = ({ children }: { children: React.ReactNode }) => <div className="flex gap-3">{children}</div>;

export const Tab = ({
  children,
  isSelected,
  ...props
}: { children: React.ReactNode; isSelected: boolean } & React.HTMLProps<HTMLAnchorElement>) => (
  <a
    className={cx("shrink-0 rounded-full px-3 py-2 no-underline", isSelected && "bg-background border-border border")}
    aria-selected={isSelected}
    {...props}
  >
    {children}
  </a>
);
