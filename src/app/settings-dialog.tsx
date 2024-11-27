'use client';

import { forwardRef } from 'react';

export const SettingsDialog = forwardRef<HTMLDivElement>(function SettingsDialog(props, ref) {
  return (
    <div
      className="fixed right-0 top-11 z-[1] flex max-h-[60vh] w-80 select-none flex-col gap-2 overflow-y-auto rounded bg-slate-100 p-2"
      ref={ref}
    >
      TODO
    </div>
  );
});
