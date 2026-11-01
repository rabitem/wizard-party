import { describe, expect, it } from 'vitest';

import {
  createSettingsFeedbackParticles,
  getSettingsBackdropClass,
  getSettingsOverlayRootClass,
  getSettingsPanelClass,
  shouldTriggerSettingsFeedback,
} from './settings-panel-feedback';

describe('settings panel feedback', () => {
  it('keeps the settings panel layered above the blurred backdrop', () => {
    expect(getSettingsOverlayRootClass()).toContain('fixed inset-0');
    expect(getSettingsOverlayRootClass()).toContain('z-[60]');
    expect(getSettingsOverlayRootClass()).toContain('pointer-events-none');
    expect(getSettingsBackdropClass()).toContain('absolute inset-0');
    expect(getSettingsBackdropClass()).toContain('pointer-events-auto');
    expect(getSettingsBackdropClass()).not.toContain('fixed');
    expect(getSettingsPanelClass(false)).toContain('z-10');
    expect(getSettingsPanelClass(false)).toContain('pointer-events-auto');
    expect(getSettingsPanelClass(true)).toContain('z-10');
    expect(getSettingsPanelClass(true)).toContain('pointer-events-auto');
  });

  it('uses a small deterministic confetti burst for settings confirmations', () => {
    const particles = createSettingsFeedbackParticles('sound-selection');

    expect(particles).toEqual(createSettingsFeedbackParticles('sound-selection'));
    expect(particles[0]).toMatchObject({
      id: 'settings-feedback-0',
      color: expect.stringMatching(/^#[0-9a-f]{6}$/),
    });
  });

  it('only celebrates explicit sound actions, not every custom sound edit', () => {
    expect(shouldTriggerSettingsFeedback('sound-selection')).toBe(true);
    expect(shouldTriggerSettingsFeedback('custom-role')).toBe(true);
    expect(shouldTriggerSettingsFeedback('shared-import')).toBe(true);
    expect(shouldTriggerSettingsFeedback('rename')).toBe(false);
    expect(shouldTriggerSettingsFeedback('remove')).toBe(false);
  });
});
