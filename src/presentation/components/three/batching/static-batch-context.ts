import { createContext } from 'react';
import type { Group } from 'three';

export type RegisterStaticRoot = (root: Group) => () => void;
export const StaticBatchContext = createContext<RegisterStaticRoot | null>(null);
