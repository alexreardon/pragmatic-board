'use client';

import { createContext, ReactElement, ReactNode, useMemo, useState } from 'react';

export type TSelectField<T = string> = {
  type: 'select';
  title: string;
  description: string;
  options: T[];
};

export type TBooleanField = {
  type: 'boolean';
  title: string;
  description: string;
  // children?: Record<string, TBooleanField | TSelectField>
};

export const fields = {
  isGlobalEnabled: {
    type: 'boolean',
    title: 'Auto scrolling',
    description: 'Whether our custom auto scroller should be enabled',
  },
  isDistanceDampeningEnabled: {
    type: 'boolean',
    title: 'Distance dampening',
    description: 'Increase the max scroll speed as you get closer to an edge',
  },
  isTimeDampeningEnabled: {
    type: 'boolean',
    title: 'Time dampening',
    description: 'Increase the max scroll speed the longer you are on an element',
  },
  boardScrollSpeed: {
    type: 'select',
    title: 'Board auto scroll speed',
    description: 'What should the max horizontal scroll speed the board be?',
    options: ['fast', 'standard'],
  },
  columnScrollSpeed: {
    type: 'select',
    title: 'Column auto scroll speed',
    description: 'What should the max vertical scroll speed for columns be?',
    options: ['fast', 'standard'],
  },
  isFPSPanelEnabled: {
    type: 'boolean',
    title: 'FPS Panel',
    description: 'Display a panel with Frame Per Second (FPS) information',
  },
  isCPUBurnEnabled: {
    type: 'boolean',
    title: 'Drop FPS 🔥',
    description: 'Start heavy process that will cause the frame rate on the page to drop',
  },
} as const satisfies Record<string, TBooleanField | TSelectField>;

export type TupleToUnion<T extends any[]> = T[number];

type GetFieldValues<TRecord extends Record<string, TBooleanField | TSelectField>> = {
  // [TKey in keyof TRecord]: TRecord[TKey] extends TBooleanField ? boolean : TRecord[TKey] extends TSelectField ? 'fast' | 'standard' : never
  [TKey in keyof TRecord]: TRecord[TKey] extends TBooleanField
    ? boolean
    : TRecord[TKey] extends TSelectField
      ? TupleToUnion<TRecord[TKey]['options']>
      : never;
};

export type TFields = typeof fields;

export type TSettings = GetFieldValues<TFields>;