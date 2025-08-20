import { usePage } from "@inertiajs/react";
import React from "react";

import BalancePage from "$app/components/server-components/BalancePage";

function index() {
  const { payout_presenter } = usePage().props as any;

  return <BalancePage {...payout_presenter} />;
}

export default index;
