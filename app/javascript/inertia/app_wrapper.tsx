import React from "react";

import { CurrentSellerProvider, parseCurrentSeller } from "$app/components/CurrentSeller";
import { DesignContextProvider, DesignSettings } from "$app/components/DesignSettings";
import { DomainSettingsProvider } from "$app/components/DomainSettings";
import { LoggedInUserProvider, parseLoggedInUser } from "$app/components/LoggedInUser";
import { SPANav } from "$app/components/SPANav";
import { SSRLocationProvider } from "$app/components/useOriginalLocation";
import { UserAgentProvider } from "$app/components/UserAgent";

type GlobalProps = {
  design_settings: DesignSettings;
  domain_settings: {
    scheme: string;
    app_domain: string;
    root_domain: string;
    short_domain: string;
    discover_domain: string;
    third_party_analytics_domain: string;
  };
  user_agent_info: {
    is_mobile: boolean;
  };
  logged_in_user: unknown;
  current_seller: unknown;
  href: string;
  locale: string;
};

export default function AppWrapper({ children, global }: { children: React.ReactNode; global: GlobalProps }) {
  // Grab the body classes from the DOM

  return (
    <React.StrictMode>
      <DesignContextProvider value={global.design_settings}>
        <DomainSettingsProvider
          value={{
            scheme: global.domain_settings.scheme,
            appDomain: global.domain_settings.app_domain,
            rootDomain: global.domain_settings.root_domain,
            shortDomain: global.domain_settings.short_domain,
            discoverDomain: global.domain_settings.discover_domain,
            thirdPartyAnalyticsDomain: global.domain_settings.third_party_analytics_domain,
          }}
        >
          <UserAgentProvider
            value={{
              isMobile: global.user_agent_info.is_mobile,
              locale: global.locale,
            }}
          >
            <LoggedInUserProvider value={parseLoggedInUser(global.logged_in_user)}>
              <CurrentSellerProvider value={parseCurrentSeller(global.current_seller)}>
                <SSRLocationProvider value={global.href}>
                  <div id="inertia-shell" className="grid grid-cols-[1fr] grid-rows-[1fr]">
                    <SPANav title="Dashboard" />
                    {children}
                  </div>
                </SSRLocationProvider>
              </CurrentSellerProvider>
            </LoggedInUserProvider>
          </UserAgentProvider>
        </DomainSettingsProvider>
      </DesignContextProvider>
    </React.StrictMode>
  );
}
