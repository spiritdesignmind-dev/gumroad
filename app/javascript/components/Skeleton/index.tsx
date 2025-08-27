import React from "react";

import { classnames } from "$app/utils/classnames";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="skeleton" className={classnames("animate-pulse rounded-md bg-slate-600", className)} {...props} />
  );
}

export { Skeleton };
