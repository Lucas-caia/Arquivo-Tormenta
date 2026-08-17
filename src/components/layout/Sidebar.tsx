import { D20Icon } from "./D20Icon";
import { routeHref, routes, type AppRoute } from "../../routing/routes";

export type SidebarProps = {
  activeRoute: AppRoute;
};

function NavigationGroup({
  title,
  group,
  activeRoute
}: {
  title: string;
  group: "principal" | "sistema";
  activeRoute: AppRoute;
}) {
  return (
    <div className="nav-group">
      <p>{title}</p>
      {routes.filter((route) => route.group === group).map((route) => {
        const Icon = route.icon;
        const active = route.id === activeRoute;
        return (
          <a
            key={route.id}
            href={routeHref(route.id)}
            className={active ? "active" : ""}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={17} aria-hidden="true" />
            {route.label}
          </a>
        );
      })}
    </div>
  );
}

export function Sidebar({ activeRoute }: SidebarProps) {
  return (
    <aside className="sidebar">
      <a className="brand" href={routeHref("dashboard")} aria-label="Arquivo Tormenta — início">
        <div className="brand-icon"><D20Icon /></div>
        <div>
          <strong>Arquivo</strong>
          <span>Tormenta</span>
        </div>
      </a>

      <nav className="nav" aria-label="Navegação principal">
        <NavigationGroup title="Principal" group="principal" activeRoute={activeRoute} />
        <NavigationGroup title="Sistema" group="sistema" activeRoute={activeRoute} />
      </nav>

    </aside>
  );
}
