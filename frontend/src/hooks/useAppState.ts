import { useContext } from "react";
import { AppStateContext } from "../app/AppStateContext";

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used inside AppProviders.");
  }
  return context;
}
