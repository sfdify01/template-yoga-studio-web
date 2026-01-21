/**
 * Validation logic for menu item selections
 */

import { VariantGroup, ValidationError, SelectionState } from './types';

export function validateSelections(
  groups: VariantGroup[],
  selections: Record<string, string[]>
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const group of groups) {
    const selected = selections[group.id] || [];
    const selectedCount = selected.length;

    // Check required
    if (group.required && selectedCount === 0) {
      errors.push({
        groupId: group.id,
        message: `Please select ${group.type === 'single' ? 'one' : 'at least one'} option for ${group.title}`,
      });
      continue;
    }

    // Check min/max for multi-select
    if (group.type === 'multi') {
      if (group.min !== undefined && selectedCount < group.min) {
        errors.push({
          groupId: group.id,
          message: `Please select at least ${group.min} option${group.min > 1 ? 's' : ''} for ${group.title}`,
        });
      }
      if (group.max !== undefined && selectedCount > group.max) {
        errors.push({
          groupId: group.id,
          message: `You can only select up to ${group.max} option${group.max > 1 ? 's' : ''} for ${group.title}`,
        });
      }
    }

    // Check single-select
    if (group.type === 'single' && selectedCount > 1) {
      errors.push({
        groupId: group.id,
        message: `Please select only one option for ${group.title}`,
      });
    }

    // Check if selected choices exist and are not sold out
    for (const choiceId of selected) {
      const choice = group.choices.find(c => c.id === choiceId);
      if (!choice) {
        errors.push({
          groupId: group.id,
          message: `Invalid selection in ${group.title}`,
        });
      } else if (choice.soldOut) {
        errors.push({
          groupId: group.id,
          message: `${choice.label} is currently sold out`,
        });
      }
    }
  }

  return errors;
}

export function getHelperText(group: VariantGroup): string | null {
  if (group.type === 'single') {
    return group.required ? 'Required' : 'Optional';
  }

  const parts: string[] = [];
  
  if (group.required) {
    parts.push('Required');
  }
  
  if (group.min !== undefined || group.max !== undefined) {
    if (group.min && group.max && group.min === group.max) {
      parts.push(`Select ${group.min}`);
    } else if (group.min && group.max) {
      parts.push(`Select ${group.min}-${group.max}`);
    } else if (group.min) {
      parts.push(`Select at least ${group.min}`);
    } else if (group.max) {
      parts.push(`Select up to ${group.max}`);
    }
  }

  return parts.length > 0 ? parts.join(' • ') : null;
}
