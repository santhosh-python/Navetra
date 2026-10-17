import { useAppState } from "./useAppState";

/** Convenience hook for the active organization's shared inventory records. */
export function useInventory() {
  const state = useAppState();
  return {
    ...state,
    source: state.dataset?.source ?? "demo",
  };
}
