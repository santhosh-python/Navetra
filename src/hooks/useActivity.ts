import { useContext } from 'react';
import { ActivityContext, type ActivityContextValue } from '../state/ActivityContext';

export function useActivity(): ActivityContextValue {
  const value = useContext(ActivityContext);
  if (!value) throw new Error('useActivity must be used inside ActivityProvider.');
  return value;
}
