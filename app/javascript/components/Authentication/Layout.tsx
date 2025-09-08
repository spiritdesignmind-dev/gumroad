import * as React from "react";

import { useDomains } from "$app/components/DomainSettings";
import { PageHeader } from "$app/components/ui/PageHeader";

import background from "$assets/images/auth/background.png";

export const Layout = ({
  children,
  header,
  headerActions,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
  headerActions?: React.ReactNode;
}) => {
  const { rootDomain, scheme } = useDomains();

  return (
    <div className="flex flex-1">
      <main className="squished flex-1">
        <PageHeader
          title={<a href={`${scheme}://${rootDomain}`} className="logo-full" aria-label="Gumroad" />}
          actions={headerActions}
          className="px-16"
        >
          {header}
        </PageHeader>
        <div className="p-16">{children}</div>
      </main>
      <aside>
        <img src={background} />
      </aside>
    </div>
  );
};
