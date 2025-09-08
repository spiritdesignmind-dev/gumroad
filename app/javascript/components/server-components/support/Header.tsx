import { HelperClientProvider } from "@helperai/react";
import React from "react";
import { createCast } from "ts-safe-cast";

import { register } from "$app/utils/serverComponentUtil";

import { Button } from "$app/components/Button";
import { UnreadTicketsBadge } from "$app/components/support/UnreadTicketsBadge";
import { PageHeader } from "$app/components/ui/PageHeader";
import { Tabs, Tab } from "$app/components/ui/Tabs";
import { useOriginalLocation } from "$app/components/useOriginalLocation";

export function SupportHeader({
  onOpenNewTicket,
  hasHelperSession = true,
}: {
  onOpenNewTicket: () => void;
  hasHelperSession?: boolean;
}) {
  const { pathname } = new URL(useOriginalLocation());
  const isHelpArticle =
    pathname.startsWith(Routes.help_center_root_path()) && pathname !== Routes.help_center_root_path();

  return (
    <PageHeader
      title="Help Center"
      actions={
        isHelpArticle ? (
          <a href={Routes.help_center_root_path()} className="button" aria-label="Search" title="Search">
            <span className="icon icon-solid-search"></span>
          </a>
        ) : hasHelperSession ? (
          <Button color="accent" onClick={onOpenNewTicket}>
            New ticket
          </Button>
        ) : null
      }
    >
      {hasHelperSession ? (
        <Tabs>
          <Tab href={Routes.help_center_root_path()} isSelected={pathname.startsWith(Routes.help_center_root_path())}>
            Articles
          </Tab>
          <Tab href={Routes.support_index_path()} isSelected={pathname.startsWith(Routes.support_index_path())}>
            Support tickets
            <UnreadTicketsBadge />
          </Tab>
        </Tabs>
      ) : null}
    </PageHeader>
  );
}

type WrapperProps = {
  host?: string | null;
  session?: {
    email?: string | null;
    emailHash?: string | null;
    timestamp?: number | null;
    customerMetadata?: {
      name?: string | null;
      value?: number | null;
      links?: Record<string, string> | null;
    } | null;
    currentToken?: string | null;
  } | null;
  new_ticket_url: string;
};

const Wrapper = ({ host, session, new_ticket_url }: WrapperProps) =>
  host && session ? (
    <HelperClientProvider host={host} session={session}>
      <SupportHeader onOpenNewTicket={() => (window.location.href = new_ticket_url)} />
    </HelperClientProvider>
  ) : (
    <SupportHeader onOpenNewTicket={() => (window.location.href = new_ticket_url)} hasHelperSession={false} />
  );

export default register({ component: Wrapper, propParser: createCast() });
