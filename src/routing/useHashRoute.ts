import { useEffect, useState } from "react";
import { defaultRoute, parseRoute, routeHref, type AppRoute } from "./routes";

export function useHashRoute() {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute(window.location.hash));

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, "", routeHref(defaultRoute));
    }

    const handleHashChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return { route };
}
