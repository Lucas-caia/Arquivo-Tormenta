import { Shield, Sparkles, Swords } from "lucide-react";

export function ClassIcon({ classe }: { classe: string }) {
  const normalized = classe.toLowerCase();
  if (normalized.includes("guerreiro") || normalized.includes("paladino")) {
    return <Shield size={13} aria-hidden="true" />;
  }
  if (normalized.includes("ladino")) return <Swords size={13} aria-hidden="true" />;
  return <Sparkles size={13} aria-hidden="true" />;
}
