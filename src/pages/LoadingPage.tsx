import { LoaderCircle } from "lucide-react";

export function LoadingPage() {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle size={26} aria-hidden="true" />
      <span>Carregando o acervo...</span>
    </div>
  );
}
