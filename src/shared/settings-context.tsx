'use client';

import { createContext, ReactNode, useEffect, useMemo, useState } from 'react';
import { TFields, TSettings, fields } from './settings';

export type TSettingsContext = {
  fields: TFields;
  settings: TSettings;
  update: (args: Partial<TSettings>) => void;
  reset: () => void;
};

const defaultSettings: TSettings = {
  isFilming: true,
  isOverElementAutoScrollEnabled: true,
  isDistanceDampeningEnabled: true,
  isTimeDampeningEnabled: true,
  boardScrollSpeed: 'fast',
  columnScrollSpeed: 'standard',
  isFPSPanelEnabled: false,
  isCPUBurnEnabled: false,
  isOverflowScrollingEnabled: true,
  areHitboxesVisible: true,
};

export const SettingsContext = createContext<TSettingsContext>({
  fields,
  settings: defaultSettings,
  update: () => {},
  reset: () => {},
});

export function SettingsContextProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<TSettings>(defaultSettings);

  useEffect(() => {
    // restore from local storage when mounting
    const string = localStorage.getItem('settings');
    if (string == null) {
      return;
    }
    console.log('setting settings from local storage');
    const value = JSON.parse(string);
    setSettings(value);
  }, []);

  const value = useMemo(() => {
    function update(partial: Partial<TSettings>) {
      const updated = { ...settings, ...partial };
      setSettings(updated);

      localStorage.setItem('settings', JSON.stringify(updated));
    }

    return {
      fields,
      settings,
      update,
      reset: () => update(defaultSettings),
    };
  }, [settings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
