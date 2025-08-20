import { usePage } from "@inertiajs/react";
import React from "react";

import ProductsDashboardPage from "$app/components/server-components/ProductsDashboardPage";

function index() {
  const { react_products_page_props } = usePage().props as any;

  return <ProductsDashboardPage {...react_products_page_props} />;
}

export default index;
