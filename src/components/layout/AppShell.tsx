import type { ReactNode } from "react";
import type { RouteDefinition, AppRoute } from "../../routing/routes";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export type AppShellProps = {
  activeRoute: AppRoute;
  routeDefinition: RouteDefinition;
  query: string;
  onQueryChange: (value: string) => void;
  showSearch: boolean;
  children: ReactNode;
  footer: ReactNode;
};

export function AppShell({
  activeRoute,
  routeDefinition,
  query,
  onQueryChange,
  showSearch,
  children,
  footer
}: AppShellProps) {
  return (
    <div className="app-shell">
      <Sidebar activeRoute={activeRoute} />
      <div className="main-shell">
        <Topbar
          route={routeDefinition}
          query={query}
          onQueryChange={onQueryChange}
          showSearch={showSearch}
        />
        <main className="page-content" id="conteudo-principal" tabIndex={-1}>
          {children}
          <footer className="footer-line">{footer}</footer>
        </main>
      </div>
    </div>
  );
}
