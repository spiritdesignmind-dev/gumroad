import { Inertia } from "@inertiajs/inertia";
import { Link } from "@inertiajs/react";
import * as React from "react";

import { escapeRegExp } from "$app/utils";
import { assertResponseError, request, ResponseError } from "$app/utils/request";
import { initTeamMemberReadOnlyAccess } from "$app/utils/team_member_read_only";

import { useCurrentSeller } from "$app/components/CurrentSeller";
import { useAppDomain, useDiscoverUrl } from "$app/components/DomainSettings";
import { Icon } from "$app/components/Icons";
import { useLoggedInUser, TeamMembership } from "$app/components/LoggedInUser";
import { Nav as NavFramework, NavLink, NavLinkDropdownItem, UnbecomeDropdownItem } from "$app/components/Nav";
import { Popover } from "$app/components/Popover";
import { useRunOnce } from "$app/components/useRunOnce";

type Props = {
  title: string;
  compact?: boolean;
};

const NavLinkDropdownMembershipItem = ({ teamMembership }: { teamMembership: TeamMembership }) => {
  const onClick = (ev: React.MouseEvent<HTMLAnchorElement>) => {
    const currentUrl = new URL(window.location.href);
    // It is difficult to tell if the account to be switched has access to the current page via policies in this context.
    // Pundit deals with that, and PunditAuthorization concern handles Pundit::NotAuthorizedError.
    // account_switched param is solely for the purpose of not showing the error message when redirecting to the
    // dashboard in case the user doesn't have access to the page.
    currentUrl.searchParams.set("account_switched", "true");
    ev.preventDefault();
    request({
      method: "POST",
      accept: "json",
      url: Routes.sellers_switch_path({ team_membership_id: teamMembership.id }),
    })
      .then((res) => {
        if (!res.ok) throw new ResponseError();
        window.location.href = currentUrl.toString();
      })
      .catch((e: unknown) => {
        assertResponseError(e);
        // showAlert("Something went wrong.", "error");
      });
  };

  return (
    <a
      role="menuitemradio"
      href={Routes.sellers_switch_path()}
      onClick={onClick}
      aria-checked={teamMembership.is_selected}
    >
      <img className="user-avatar" src={teamMembership.seller_avatar_url} alt={teamMembership.seller_name} />
      <span title={teamMembership.seller_name}>{teamMembership.seller_name}</span>
    </a>
  );
};

const useInertiaUrl = () => {
  const [url, setUrl] = React.useState(window.location.pathname);

  React.useEffect(() => {
    const update = (event: any) => setUrl(new URL(event.detail.page.url, window.location.origin).pathname);
    Inertia.on("navigate", update);
  }, []);

  return url;
};

const SPANavLink = ({
  text,
  icon,
  href,
  additionalPatterns = [],
}: {
  text: string;
  icon?: IconName;
  href: string;
  additionalPatterns?: string[];
}) => {
  const currentPath = useInertiaUrl();

  const ariaCurrent = [href, ...additionalPatterns].some((pattern) => {
    const escaped = escapeRegExp(pattern);
    return new RegExp(escaped, "u").test(currentPath);
  })
    ? "page"
    : undefined;

  return (
    <Link href={href} preserveScroll aria-current={ariaCurrent}>
      {icon ? <Icon name={icon} /> : null}
      {text}
    </Link>
  );
};

export const SPANav = (props: Props) => {
  const routeParams = { host: useAppDomain() };
  const loggedInUser = useLoggedInUser();
  const currentSeller = useCurrentSeller();
  const discoverUrl = useDiscoverUrl();
  const teamMemberships = loggedInUser?.teamMemberships;

  React.useEffect(() => {
    const selectedTeamMembership = teamMemberships?.find((teamMembership) => teamMembership.is_selected);
    // Only initialize the code if loggedInUser's team membership role has some read-only access
    // It applies to all roles except Owner and Admin
    if (selectedTeamMembership?.has_some_read_only_access) {
      initTeamMemberReadOnlyAccess();
    }
  }, []);

  // Removes the param set when switching accounts
  useRunOnce(() => {
    const url = new URL(window.location.href);
    const accountSwitched = url.searchParams.get("account_switched");
    if (accountSwitched) {
      url.searchParams.delete("account_switched");
      window.history.replaceState(window.history.state, "", url.toString());
    }
  });

  return (
    <NavFramework
      footer={
        <>
          {currentSeller?.isBuyer ? (
            <NavLink text="Start selling" icon="shop-window-fill" href={Routes.dashboard_url(routeParams)} />
          ) : null}
          <NavLink text="Settings" icon="gear-fill" href={Routes.settings_main_url(routeParams)} />
          <NavLink text="Help" icon="book" href={Routes.help_center_root_url(routeParams)} />
          <Popover
            position="top"
            trigger={
              <>
                <img className="user-avatar" src={currentSeller?.avatarUrl} alt="Your avatar" />
                {currentSeller?.name || currentSeller?.email}
              </>
            }
          >
            <div role="menu">
              {teamMemberships != null && teamMemberships.length > 0 ? (
                <>
                  {teamMemberships.map((teamMembership) => (
                    <NavLinkDropdownMembershipItem key={teamMembership.id} teamMembership={teamMembership} />
                  ))}
                  <hr />
                </>
              ) : null}
              <NavLinkDropdownItem
                text="Profile"
                icon="shop-window-fill"
                href={Routes.root_url({ ...routeParams, host: currentSeller?.subdomain ?? routeParams.host })}
              />
              <NavLinkDropdownItem text="Affiliates" icon="gift-fill" href={Routes.affiliates_url(routeParams)} />
              <NavLinkDropdownItem text="Logout" icon="box-arrow-in-right-fill" href={Routes.logout_url(routeParams)} />
              {loggedInUser?.isImpersonating ? <UnbecomeDropdownItem /> : null}
            </div>
          </Popover>
        </>
      }
      {...props}
    >
      <section>
        <SPANavLink text="Home" icon="shop-window-fill" href="/dashboard" />
        <SPANavLink
          text="Products"
          icon="archive-fill"
          href="/products"
          additionalPatterns={[Routes.bundle_path(".", routeParams).slice(0, -1)]}
        />
        {loggedInUser?.policies.collaborator.create ? (
          <SPANavLink text="Collaborators" icon="deal-fill" href="/collaborators" />
        ) : null}
        <NavLink
          text="Checkout"
          icon="cart3-fill"
          href={Routes.checkout_discounts_url(routeParams)}
          additionalPatterns={[Routes.checkout_form_url(routeParams), Routes.checkout_upsells_url(routeParams)]}
        />
        <NavLink
          text="Emails"
          icon="envelope-fill"
          href={Routes.emails_url(routeParams)}
          additionalPatterns={[Routes.followers_url(routeParams)]}
        />
        <NavLink text="Workflows" icon="diagram-2-fill" href={Routes.workflows_url(routeParams)} />
        <SPANavLink text="Sales" icon="solid-currency-dollar" href="/customers" />
        <SPANavLink text="Analytics" icon="bar-chart-fill" href="/dashboard/sales" />
        {loggedInUser?.policies.balance.index ? <SPANavLink text="Payouts" icon="bank" href="/payouts" /> : null}
        {loggedInUser?.policies.community.index ? (
          <NavLink text="Community" icon="solid-chat-alt" href={Routes.community_path(routeParams)} />
        ) : null}
      </section>
      <section>
        <NavLink text="Discover" icon="solid-search" href={discoverUrl} exactHrefMatch />
        {currentSeller?.id === loggedInUser?.id ? (
          <NavLink
            text="Library"
            icon="bookmark-heart-fill"
            href={Routes.library_url(routeParams)}
            additionalPatterns={[Routes.wishlists_url(routeParams)]}
          />
        ) : null}
      </section>
    </NavFramework>
  );
};
