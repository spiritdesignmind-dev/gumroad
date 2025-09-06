import * as React from "react";

import { useOnScrollToBottom } from "$app/components/useOnScrollToBottom";
import { PageHeader } from "$app/components/ui/PageHeader";
import { Tabs, Tab } from "$app/components/ui/Tabs";

export const Layout = ({
  selectedTab,
  onScrollToBottom,
  reviewsPageEnabled = true,
  followingWishlistsEnabled = true,
  children,
}: {
  selectedTab: "purchases" | "wishlists" | "following_wishlists" | "reviews";
  onScrollToBottom?: () => void;
  reviewsPageEnabled?: boolean;
  followingWishlistsEnabled: boolean;
  children: React.ReactNode;
}) => {
  const ref = React.useRef<HTMLElement>(null);

  useOnScrollToBottom(ref, () => onScrollToBottom?.(), 30);

  return (
    <main className="library" ref={ref}>
      <PageHeader title="Library">
        <Tabs>
          <Tab href={Routes.library_path()} isSelected={selectedTab === "purchases"}>
            Purchases
          </Tab>
          <Tab href={Routes.wishlists_path()} isSelected={selectedTab === "wishlists"}>
            {followingWishlistsEnabled ? "Saved" : "Wishlists"}
          </Tab>
          {followingWishlistsEnabled ? (
            <Tab
              href={Routes.wishlists_following_index_path()}
              isSelected={selectedTab === "following_wishlists"}
            >
              Following
            </Tab>
          ) : null}
          {reviewsPageEnabled ? (
            <Tab href={Routes.reviews_path()} isSelected={selectedTab === "reviews"}>
              Reviews
            </Tab>
          ) : null}
        </Tabs>
      </PageHeader>
      {children}
    </main>
  );
};
Layout.displayName = "Layout";
