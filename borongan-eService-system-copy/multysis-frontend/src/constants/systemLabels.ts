/**
 * Single source of truth for system → human-readable label mapping.
 * Used by role modals, page modals, sidebar, and any UI displaying system names.
 *
 * NOTE: This maps page systems. Seeded roles have system='eservice' which is
 * a legacy value with no corresponding pages. Those roles will show 'eservice'
 * as the label (acceptable fallback). Fix seed data separately.
 */
export const SYSTEM_LABELS: Record<string, string> = {
  core: 'Core',
  'libre-sakay': 'Libre Sakay',
  'libre-medisina': 'Libre Medisina',
  'government-programs': 'Government Programs',
  services: 'E-Government Services',
};

/**
 * Fallback for unknown system values — capitalizes and returns the raw value.
 * Ensures no system ever renders as "undefined" or blank in the UI.
 */
export function getSystemLabel(system: string | undefined | null): string {
  if (!system) return 'Unknown';
  return SYSTEM_LABELS[system] ?? system.charAt(0).toUpperCase() + system.slice(1);
}
