import { Inertia } from "@inertiajs/inertia";
import * as React from "react";

type InertiaNavigateEvent = {
  detail: {
    page: {
      url: string;
    };
  };
};

export const useInertiaURL = () => {
  const [url, setUrl] = React.useState(window.location.href);

  React.useEffect(() => {
    const update = (event: InertiaNavigateEvent) => setUrl(new URL(event.detail.page.url, window.location.origin).href);
    Inertia.on("navigate", update);
  }, []);

  return url;
};
