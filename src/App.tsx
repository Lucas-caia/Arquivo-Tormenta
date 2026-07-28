import { useState, type MouseEvent } from "react";
import { AppShell } from "./components/layout/AppShell";
import { FichaDetailModal } from "./components/fichas/FichaDetailModal";
import { ComparisonModal } from "./components/revisoes/ComparisonModal";
import { Toast } from "./components/common/Toast";
import { useArquivoTormenta } from "./hooks/useArquivoTormenta";
import { DashboardPage } from "./pages/DashboardPage";
import { FichasPage } from "./pages/FichasPage";
import { GitHubPage } from "./pages/GitHubPage";
import { LoadingPage } from "./pages/LoadingPage";
import { RevisoesPage } from "./pages/RevisoesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { UploadPage } from "./pages/UploadPage";
import { getRouteDefinition } from "./routing/routes";
import { useHashRoute } from "./routing/useHashRoute";
import { useAccessibilitySettings } from "./settings/useAccessibilitySettings";

export default function App() {
  function skipToContent(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    document.getElementById("conteudo-principal")?.focus();
  }

  const { route } = useHashRoute();
  const routeDefinition = getRouteDefinition(route);
  const [query, setQuery] = useState("");
  const accessibility = useAccessibilitySettings();
  const arquivo = useArquivoTormenta();
  const showSearch = route === "dashboard" || route === "fichas" || route === "revisoes";

  function renderPage() {
    if (arquivo.loading) return <LoadingPage />;

    switch (route) {
      case "fichas":
        return (
          <FichasPage
            fichas={arquivo.fichas}
            query={query}
            onView={arquivo.handleView}
            onCompare={arquivo.handleCompare}
            onApprove={arquivo.handleApprove}
          />
        );
      case "upload":
        return <UploadPage busy={arquivo.uploadBusy} onFile={arquivo.handleUpload} />;
      case "revisoes":
        return (
          <RevisoesPage
            fichas={arquivo.fichas}
            query={query}
            onView={arquivo.handleView}
            onCompare={arquivo.handleCompare}
            onApprove={arquivo.handleApprove}
          />
        );
      case "github":
        return (
          <GitHubPage
            status={arquivo.git}
            busy={arquivo.gitBusy}
            onRefresh={arquivo.handleRefreshGit}
            onPull={arquivo.handlePull}
            onPush={arquivo.handlePush}
          />
        );
      case "configuracoes":
        return (
          <SettingsPage
            settings={accessibility.settings}
            onChange={accessibility.updateSettings}
            onReset={accessibility.resetSettings}
          />
        );
      case "dashboard":
      default:
        return (
          <DashboardPage
            fichas={arquivo.fichas}
            stats={arquivo.stats}
            git={arquivo.git}
            gitBusy={arquivo.gitBusy}
            actionBusy={arquivo.actionBusy}
            query={query}
            onView={arquivo.handleView}
            onCompare={arquivo.handleCompare}
            onApprove={arquivo.handleApprove}
            onApproveAll={arquivo.handleApproveAll}
            onRefreshGit={arquivo.handleRefreshGit}
            onPull={arquivo.handlePull}
            onPush={arquivo.handlePush}
          />
        );
    }
  }

  return (
    <>
      <a className="skip-link" href="#conteudo-principal" onClick={skipToContent}>Pular para o conteúdo</a>
      <AppShell
        activeRoute={route}
        routeDefinition={routeDefinition}
        query={query}
        onQueryChange={setQuery}
        showSearch={showSearch}
        footer={(
          <>
            <span>Arquivo Tormenta RPG · v1.1.0 · modo privado</span>
            <span>/data/fichas · {arquivo.stats.total} ficha(s)</span>
          </>
        )}
      >
        {renderPage()}
      </AppShell>

      {arquivo.revisao && (
        <ComparisonModal
          revisao={arquivo.revisao}
          busy={arquivo.actionBusy}
          onClose={arquivo.closeRevision}
          onApply={arquivo.handleApplyRevision}
          onDiscard={arquivo.handleDiscardRevision}
        />
      )}
      {arquivo.detail && <FichaDetailModal ficha={arquivo.detail} onClose={arquivo.closeDetail} />}
      {arquivo.toast && <Toast message={arquivo.toast} onClose={arquivo.closeToast} />}
    </>
  );
}
