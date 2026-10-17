import { useContext } from 'react';
import { InventoryContext, type InventoryContextValue } from '../state/InventoryContext';

export function useInventory(): InventoryContextValue {
  const value = useContext(InventoryContext);
  if (!value) throw new Error('useInventory must be used inside InventoryProvider.');
  return value;
}
