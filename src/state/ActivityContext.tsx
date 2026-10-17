import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import type { RecommendationStatus, RecordedAction } from '../types/recommendations';
import { createId } from '../lib/ids';
import { DEMO_AS_OF_DATE, addDays } from '../lib/dates';

/** Session-only activity for an item (edits, recorded actions). Not persisted and not sent anywhere. */
export interface ActivityEvent {
  id: string;
  itemId: string;
  /** Date (ISO) the event was recorded in the session. */
  date: string;
  label: string;
  detail: string;
}

export interface ActivityContextValue {
  statuses: Record<string, RecommendationStatus>;
  getStatus: (itemId: string) => RecommendationStatus;
  setReviewed: (itemId: string, reviewed: boolean) => void;
  snooze: (itemId: string, days: number | null) => void;
  recordedActions: RecordedAction[];
  recordAction: (itemId: string, actionTaken: string, note: string) => void;
  events: ActivityEvent[];
  logEvent: (itemId: string, label: string, detail: string) => void;
}

const EMPTY_STATUS: RecommendationStatus = { reviewed: false, snoozedUntil: null };

export const ActivityContext = createContext<ActivityContextValue | null>(null);

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [statuses, setStatuses] = useState<Record<string, RecommendationStatus>>({});
  const [recordedActions, setRecordedActions] = useState<RecordedAction[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  const getStatus = useCallback((itemId: string) => statuses[itemId] ?? EMPTY_STATUS, [statuses]);

  const setReviewed = useCallback((itemId: string, reviewed: boolean) => {
    setStatuses((current) => ({
      ...current,
      [itemId]: { ...(current[itemId] ?? EMPTY_STATUS), reviewed },
    }));
  }, []);

  const snooze = useCallback((itemId: string, days: number | null) => {
    setStatuses((current) => ({
      ...current,
      [itemId]: {
        ...(current[itemId] ?? EMPTY_STATUS),
        snoozedUntil: days === null ? null : addDays(DEMO_AS_OF_DATE, days),
      },
    }));
  }, []);

  const logEvent = useCallback((itemId: string, label: string, detail: string) => {
    setEvents((current) => [
      { id: createId('event'), itemId, date: DEMO_AS_OF_DATE, label, detail },
      ...current,
    ]);
  }, []);

  const recordAction = useCallback(
    (itemId: string, actionTaken: string, note: string) => {
      const action: RecordedAction = {
        id: createId('action'),
        itemId,
        recordedAt: DEMO_AS_OF_DATE,
        actionTaken,
        note,
      };
      setRecordedActions((current) => [action, ...current]);
      setEvents((current) => [
        { id: createId('event'), itemId, date: DEMO_AS_OF_DATE, label: 'Action recorded', detail: actionTaken },
        ...current,
      ]);
    },
    [],
  );

  const value = useMemo<ActivityContextValue>(
    () => ({
      statuses,
      getStatus,
      setReviewed,
      snooze,
      recordedActions,
      recordAction,
      events,
      logEvent,
    }),
    [statuses, getStatus, setReviewed, snooze, recordedActions, recordAction, events, logEvent],
  );

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}
