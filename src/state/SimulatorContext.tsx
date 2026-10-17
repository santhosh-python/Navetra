import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import type { SavedScenario, ScenarioSettings } from '../types/simulator';
import { createId } from '../lib/ids';
import { DEMO_AS_OF_DATE } from '../lib/dates';

export interface SimulatorContextValue {
  savedScenarios: SavedScenario[];
  saveScenario: (name: string, settings: ScenarioSettings) => SavedScenario;
  deleteScenario: (scenarioId: string) => void;
}

export const SimulatorContext = createContext<SimulatorContextValue | null>(null);

/** Saved what-if scenarios. Kept for the current browser session only. */
export function SimulatorProvider({ children }: { children: ReactNode }) {
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);

  const saveScenario = useCallback((name: string, settings: ScenarioSettings) => {
    const scenario: SavedScenario = {
      id: createId('scenario'),
      name: name.trim(),
      savedAt: DEMO_AS_OF_DATE,
      settings: { ...settings },
    };
    setSavedScenarios((current) => [scenario, ...current]);
    return scenario;
  }, []);

  const deleteScenario = useCallback((scenarioId: string) => {
    setSavedScenarios((current) => current.filter((scenario) => scenario.id !== scenarioId));
  }, []);

  const value = useMemo(() => ({ savedScenarios, saveScenario, deleteScenario }), [savedScenarios, saveScenario, deleteScenario]);

  return <SimulatorContext.Provider value={value}>{children}</SimulatorContext.Provider>;
}
