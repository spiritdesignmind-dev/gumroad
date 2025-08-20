import { usePage } from "@inertiajs/react";
import React from "react";

import AnalyticsPage from "$app/components/server-components/AnalyticsPage";

function Analytics() {
  const { analytics_props } = usePage().props as any;

  return <AnalyticsPage {...analytics_props} />;
}

export default Analytics;
