import React from "react";

import { cn } from "$app/utils/cn";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cn("animate-pulse rounded-md bg-slate-600", className)} {...props} />;
}

export { Skeleton };
