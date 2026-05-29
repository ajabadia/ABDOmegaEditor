import { useCallback } from 'react';
import { useManifestEditor } from './useManifestEditor';

/**
 * OMEGA ERA 7.2.3 - TRANSACTION HOOK
 * Provides a simplified interface for executing atomic operations.
 */
export const useTransaction = (
  workbenchState: import('../types/workbench').WorkbenchState,
  workbenchActions: ReturnType<typeof import('./useWorkbenchState').useWorkbenchState>['actions']
) => {
  const { startTransaction, commitTransaction, abortTransaction } = useManifestEditor(workbenchState, workbenchActions);

  const runInTransaction = useCallback(async (label: string, action: () => void | Promise<void>) => {
    startTransaction(label);
    try {
      await action();
      commitTransaction();
    } catch (err) {
      console.error(`[TRANSACTION] Error during '${label}':`, err);
      abortTransaction();
      throw err;
    }
  }, [startTransaction, commitTransaction, abortTransaction]);

  return {
    runInTransaction,
    startTransaction,
    commitTransaction,
    abortTransaction
  };
};
