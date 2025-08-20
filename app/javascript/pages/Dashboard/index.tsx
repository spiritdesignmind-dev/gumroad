import { usePage } from "@inertiajs/react";
import React from "react";

import { DashboardPage } from "$app/components/server-components/DashboardPage";

function Dashboard() {
  const { creator_home } = usePage().props as any;

  return <DashboardPage {...creator_home} />;
}

export default Dashboard;
