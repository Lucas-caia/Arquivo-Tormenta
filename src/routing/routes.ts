import type { LucideIcon } from "lucide-react";
import {
  FileText,
  Github,
  GitPullRequest,
  LayoutDashboard,
  Settings,
  Upload
} from "lucide-react";

export type AppRoute = "dashboard" | "fichas" | "upload" | "revisoes" | "github" | "configuracoes";

export type RouteDefinition = {
  id: AppRoute;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  group: "principal" | "sistema";
};

export const routes: RouteDefinition[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    title: "Visão geral",
    description: "Acompanhe o acervo, as pendências e as operações recentes.",
    icon: LayoutDashboard,
    group: "principal"
  },
  {
    id: "fichas",
    label: "Fichas",
    title: "Fichas de personagens",
    description: "Consulte e gerencie todas as fichas armazenadas.",
    icon: FileText,
    group: "principal"
  },
  {
    id: "upload",
    label: "Enviar PDF",
    title: "Importar ficha",
    description: "Extraia os dados do modelo de PDF suportado com validação segura.",
    icon: Upload,
    group: "principal"
  },
  {
    id: "revisoes",
    label: "Revisões",
    title: "Revisões pendentes",
    description: "Compare versões antes de atualizar a ficha oficial.",
    icon: GitPullRequest,
    group: "principal"
  },
  {
    id: "github",
    label: "GitHub",
    title: "Sincronização Git",
    description: "Sincronize os arquivos JSON com o repositório configurado.",
    icon: Github,
    group: "sistema"
  },
  {
    id: "configuracoes",
    label: "Configurações",
    title: "Configurações",
    description: "Ajuste aparência, legibilidade e preferências de acessibilidade.",
    icon: Settings,
    group: "sistema"
  }
];

export const defaultRoute: AppRoute = "dashboard";

export function routeHref(route: AppRoute) {
  return `#/${route}`;
}

export function parseRoute(hash: string): AppRoute {
  const candidate = hash.replace(/^#\/?/, "") as AppRoute;
  return routes.some((route) => route.id === candidate) ? candidate : defaultRoute;
}

export function getRouteDefinition(routeId: AppRoute) {
  return routes.find((route) => route.id === routeId) ?? routes[0];
}
