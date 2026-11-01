import { describe, expect, it } from 'vitest';

import { missingProductionSettings, PRODUCTION_SETTINGS } from './deployment-requirements';

const COMPLETE = Object.fromEntries(PRODUCTION_SETTINGS.map((setting) => [setting.name, 'set']));

describe('missingProductionSettings', () => {
  it('should accept a deployment that names every setting', () => {
    expect(missingProductionSettings(COMPLETE)).toEqual([]);
  });

  it.each(PRODUCTION_SETTINGS.map((setting) => setting.name))('should name %s when it is missing or blank', (name) => {
    expect(missingProductionSettings({ ...COMPLETE, [name]: undefined }).join()).toContain(name);
    expect(missingProductionSettings({ ...COMPLETE, [name]: '  ' }).join()).toContain(name);
  });
});
