import { stanceLabels, type Scenario } from '@/lib/scenario-analysis';
export type ScenarioProps = { scenario: Scenario; update: (patch: Partial<Scenario>, event?: string) => void };
export function StanceBadge({ stance }: { stance: keyof typeof stanceLabels }) {
  const classes = { requires: 'bg-teal-800 text-white', supports: 'bg-teal-500/15 text-teal-800 dark:text-teal-200', restricts: 'bg-orange-500/15 text-orange-800 dark:text-orange-200', forbids: 'bg-red-900 text-white', mentions: 'bg-muted text-muted-foreground' };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes[stance]}`}>{stanceLabels[stance]}</span>;
}
