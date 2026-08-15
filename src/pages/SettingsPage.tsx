import { Contrast, Eye, Palette, RotateCcw, ShieldCheck, Text, WandSparkles } from "lucide-react";
import type { AccessibilitySettings } from "../settings/accessibility";
export function SettingsPage({
  settings,
  onChange,
  onReset
}: {
  settings: AccessibilitySettings;
  onChange: (patch: Partial<AccessibilitySettings>) => void;
  onReset: () => void;
}) {
  return (
    <div className="settings-grid">
      <section className="settings-card">
        <header>
          <div><Eye size={19} aria-hidden="true" /><span><strong>Aparência</strong><small>Escolha o esquema visual da interface.</small></span></div>
        </header>
        <div className="setting-options" role="radiogroup" aria-label="Aparência">
          {(["system", "dark", "light"] as const).map((appearance) => (
            <label key={appearance}>
              <input
                type="radio"
                name="appearance"
                checked={settings.appearance === appearance}
                onChange={() => onChange({ appearance })}
              />
              <span>{appearance === "system" ? "Sistema" : appearance === "dark" ? "Escuro" : "Claro"}</span>
            </label>
          ))}
        </div>
      </section>
      <section className="settings-card">
        <header>
          <div><Text size={19} aria-hidden="true" /><span><strong>Tamanho do texto</strong><small>Aumente a legibilidade sem ampliar o navegador.</small></span></div>
        </header>
        <div className="setting-options" role="radiogroup" aria-label="Tamanho do texto">
          {(["normal", "large"] as const).map((fontSize) => (
            <label key={fontSize}>
              <input
                type="radio"
                name="font-size"
                checked={settings.fontSize === fontSize}
                onChange={() => onChange({ fontSize })}
              />
              <span>{fontSize === "normal" ? "Padrão" : "Ampliado"}</span>
            </label>
          ))}
        </div>
      </section>
      <section className="settings-card toggle-card">
        <header>
          <div><Contrast size={19} aria-hidden="true" /><span><strong>Alto contraste</strong><small>Reforça bordas, textos e estados de foco.</small></span></div>
          <label className="switch">
            <input type="checkbox" checked={settings.highContrast} onChange={(event) => onChange({ highContrast: event.target.checked })} />
            <span aria-hidden="true" />
          </label>
        </header>
      </section>
      <section className="settings-card toggle-card">
        <header>
          <div><Palette size={19} aria-hidden="true" /><span><strong>Preto e branco</strong><small>Remove as cores da interface e exibe o sistema em escala de cinza.</small></span></div>
          <label className="switch">
            <input type="checkbox" checked={settings.monochrome} onChange={(event) => onChange({ monochrome: event.target.checked })} />
            <span aria-hidden="true" />
          </label>
        </header>
      </section>
      <section className="settings-card toggle-card">
        <header>
          <div><WandSparkles size={19} aria-hidden="true" /><span><strong>Reduzir movimento</strong><small>Desativa transições e animações não essenciais.</small></span></div>
          <label className="switch">
            <input type="checkbox" checked={settings.reduceMotion} onChange={(event) => onChange({ reduceMotion: event.target.checked })} />
            <span aria-hidden="true" />
          </label>
        </header>
      </section>
      <section className="settings-card access-explanation">
        <header>
          <div><ShieldCheck size={19} aria-hidden="true" /><span><strong>Acesso privado</strong><small>Decisão arquitetural atual.</small></span></div>
        </header>
        <p>O controle ocorre pelo acesso ao ambiente local e pelas permissões do repositório Git. A ausência de uma camada de contas está documentada no README e pode ser revista no futuro.</p>
      </section>
      <div className="settings-actions">
        <button className="button" onClick={onReset}><RotateCcw size={15} aria-hidden="true" /> Restaurar padrões</button>
      </div>
    </div>
  );
}
