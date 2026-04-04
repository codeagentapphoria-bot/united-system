import { AdjustmentBreakdown, TaxConfiguration } from './tax-engine.service';
import { evaluateCondition } from './condition-evaluator.service';

export interface ApplyAdjustmentsOptions {
  baseTax: number;
  configuration: TaxConfiguration;
  serviceData: Record<string, any>;
  approvedExemptions?: Array<{ id: string; amount: number }>;
}

export interface AdjustmentResult {
  adjustedTax: number;
  breakdown: AdjustmentBreakdown;
  exemptionsApplied: string[];
  discountsApplied: string[];
  penaltiesApplied: string[];
}

/**
 * Applies adjustment rules (exemptions, discounts, penalties) to base tax
 * Rules are processed in priority order (lower priority = applied first)
 */
export function applyAdjustments(options: ApplyAdjustmentsOptions): AdjustmentResult {
  const { baseTax, configuration, serviceData, approvedExemptions = [] } = options;

  // Get adjustment rules from configuration
  const adjustmentRules = configuration.adjustmentRules || [];

  // Sort rules by priority (ascending - lower priority applied first)
  const sortedRules = [...adjustmentRules].sort((a, b) => a.priority - b.priority);

  let adjustedTax = baseTax;
  const applied: AdjustmentBreakdown['applied'] = [];
  const skipped: AdjustmentBreakdown['skipped'] = [];
  const exemptionsApplied: string[] = [];
  const discountsApplied: string[] = [];
  const penaltiesApplied: string[] = [];

  // Process each rule
  for (const rule of sortedRules) {
    try {
      // Evaluate condition
      const conditionPasses = evaluateCondition(rule.condition, serviceData);

      if (!conditionPasses) {
        skipped.push({
          rule,
          reason: `Condition not met: ${rule.condition.field} ${rule.condition.operator} ${rule.condition.value}`,
        });
        continue;
      }

      // Apply adjustment based on type
      let adjustmentAmount = 0;
      let description = '';

      switch (rule.type) {
        case 'EXEMPTION':
          // Exemptions are matched against approved exemptions.
          // Match by id, or fall back to the first approved exemption if only one exists.
          let exemption =
            approvedExemptions.find((e) => e.id === rule.name || e.id === rule.description) ||
            approvedExemptions[0];

          if (exemption) {
            adjustmentAmount = rule.amount ?? exemption.amount ?? 0;
            description = `${rule.name}: Exemption of ${adjustmentAmount}`;
            exemptionsApplied.push(rule.name);
            adjustedTax = Math.max(0, adjustedTax - adjustmentAmount);
          } else {
            skipped.push({
              rule,
              reason: 'Exemption not approved',
            });
            continue;
          }
          break;

        case 'DISCOUNT':
          if (rule.percentage !== undefined) {
            // Percentage-based discount
            adjustmentAmount = (adjustedTax * rule.percentage) / 100;
            // Apply max amount cap if specified
            if (rule.maxAmount !== undefined) {
              adjustmentAmount = Math.min(adjustmentAmount, rule.maxAmount);
            }
            description = `${rule.name}: ${rule.percentage}% discount (${adjustmentAmount})`;
          } else if (rule.amount !== undefined) {
            // Fixed amount discount
            adjustmentAmount = rule.amount;
            description = `${rule.name}: Discount of ${adjustmentAmount}`;
          } else {
            skipped.push({
              rule,
              reason: 'Discount rule must have either percentage or amount',
            });
            continue;
          }
          discountsApplied.push(rule.name);
          adjustedTax = Math.max(0, adjustedTax - adjustmentAmount);
          break;

        case 'PENALTY':
          if (rule.percentage !== undefined) {
            // Percentage-based penalty
            adjustmentAmount = (adjustedTax * rule.percentage) / 100;
            // Apply max amount cap if specified
            if (rule.maxAmount !== undefined) {
              adjustmentAmount = Math.min(adjustmentAmount, rule.maxAmount);
            }
            description = `${rule.name}: ${rule.percentage}% penalty (${adjustmentAmount})`;
          } else if (rule.amount !== undefined) {
            // Fixed amount penalty
            adjustmentAmount = rule.amount;
            description = `${rule.name}: Penalty of ${adjustmentAmount}`;
          } else {
            skipped.push({
              rule,
              reason: 'Penalty rule must have either percentage or amount',
            });
            continue;
          }
          penaltiesApplied.push(rule.name);
          adjustedTax = adjustedTax + adjustmentAmount;
          break;

        default:
          skipped.push({
            rule,
            reason: `Unknown adjustment type: ${rule.type}`,
          });
          continue;
      }

      // Record applied adjustment
      applied.push({
        rule,
        amount: adjustmentAmount,
        description: description || rule.name,
      });
    } catch (error: any) {
      // If condition evaluation fails, skip the rule
      skipped.push({
        rule,
        reason: `Error evaluating condition: ${error.message}`,
      });
    }
  }

  // Ensure adjusted tax is not negative
  adjustedTax = Math.max(0, adjustedTax);

  return {
    adjustedTax,
    breakdown: {
      applied,
      skipped,
    },
    exemptionsApplied,
    discountsApplied,
    penaltiesApplied,
  };
}

/**
 * Calculates adjustment breakdown for display purposes
 */
export function calculateAdjustmentBreakdown(result: AdjustmentResult): AdjustmentBreakdown {
  return result.breakdown;
}
