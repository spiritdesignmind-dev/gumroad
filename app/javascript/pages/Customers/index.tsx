import { usePage } from "@inertiajs/react";
import React from "react";

import CustomersPage from "$app/components/server-components/Audience/CustomersPage";

function index() {
  const { customers_presenter } = usePage().props as any;

  return <CustomersPage {...customers_presenter} />;
}

export default index;
