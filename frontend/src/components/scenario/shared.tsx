/**
 * Provides small presentation controls and types reused by the inventory workflow without duplicating behavior.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { stanceLabels, type Scenario } from '@/lib/scenario-analysis';
export type ScenarioProps = { scenario: Scenario; update: (patch: Partial<Scenario>, event?: string) => void };
export function StanceBadge({ stance }: { stance: keyof typeof stanceLabels }) {
  const classes = { requires: 'bg-primary text-white', supports: 'bg-muted text-primary', restricts: 'bg-muted text-at-risk', forbids: 'bg-off-track text-white', mentions: 'bg-muted text-muted-foreground' };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes[stance]}`}>{stanceLabels[stance]}</span>;
}
