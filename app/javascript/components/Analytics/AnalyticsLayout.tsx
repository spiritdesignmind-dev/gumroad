import * as React from "react";

import { assertDefined } from "$app/utils/assert";

import { useLoggedInUser } from "$app/components/LoggedInUser";
import { PageHeader } from "$app/components/ui/PageHeader";

export const AnalyticsLayout = ({
  selectedTab,
  children,
  actions,
}: {
  selectedTab: "following" | "sales" | "utm_links";
  children: React.ReactNode;
  actions?: React.ReactNode;
}) => {
  const user = assertDefined(useLoggedInUser());

  return (
    <main>
      <PageHeader title="Analytics" actions={actions}>
        <div role="tablist">
          <a href={Routes.audience_dashboard_path()} role="tab" aria-selected={selectedTab === "following"}>
            Following
          </a>
          <a href={Routes.sales_dashboard_path()} role="tab" aria-selected={selectedTab === "sales"}>
            Sales
          </a>
          {user.policies.utm_link.index ? (
            <a href={Routes.utm_links_dashboard_path()} role="tab" aria-selected={selectedTab === "utm_links"}>
              Links
            </a>
          ) : null}
        </div>
      </PageHeader>
      {children}
    </main>
  );
};
