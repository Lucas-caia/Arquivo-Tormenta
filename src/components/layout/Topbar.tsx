import { Search, Upload } from "lucide-react";
import { routeHref, type RouteDefinition } from "../../routing/routes";

export type TopbarProps = {
  route: RouteDefinition;
  query: string;
  onQueryChange: (value: string) => void;
  showSearch: boolean;
};

export function Topbar({ route, query, onQueryChange, showSearch }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>{route.title}</h1>
        <p>{route.description}</p>
      </div>

      {showSearch && (
        <label className="search-box">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Buscar fichas</span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar por personagem, jogador, classe ou status..."
          />
        </label>
      )}

      <a className="button primary topbar-action" href={routeHref("upload")}>
        <Upload size={15} aria-hidden="true" />
        Enviar PDF
      </a>
    </header>
  );
}
