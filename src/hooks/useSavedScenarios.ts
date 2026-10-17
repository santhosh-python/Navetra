import { useContext } from 'react';
import { SimulatorContext, type SimulatorContextValue } from '../state/SimulatorContext';

export function useSavedScenarios(): SimulatorContextValue {
  const value = useContext(SimulatorContext);
  if (!value) throw new Error('useSavedScenarios must be used inside SimulatorProvider.');
  return value;
}
