import * as React from "react";
import { Link } from "react-router-dom";

import { PageHeader } from "$app/components/ui/PageHeader";

type LayoutProps = {
  title: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  selectedTab?: "collaborators" | "collaborations";
  showTabs?: boolean;
};

export const Layout = ({
  title,
  headerActions,
  children,
  selectedTab = "collaborators",
  showTabs = false,
}: LayoutProps) => (
  <main>
    <PageHeader title={title} actions={headerActions}>
      {showTabs ? (
        <div role="tablist">
          <Link aria-selected={selectedTab === "collaborators"} to={Routes.collaborators_path()} role="tab">
            Collaborators
          </Link>

          <Link aria-selected={selectedTab === "collaborations"} to={Routes.collaborators_incomings_path()} role="tab">
            Collaborations
          </Link>
        </div>
      ) : null}
    </PageHeader>
    {children}
  </main>
);
