import { reconciliationService } from './reconciliationService';

/**
 * PHASE 20.9 - RUNTIME STATE RECONCILIATION TEST
 * Verifies that divergence is detected and resolved deterministically.
 */
function runReconciliationTest() {
  console.log('--- STARTING PHASE 20.9 RECONCILIATION TEST ---');

  const uiState = {
    'osc1/frequency': 440,
    'osc1/gain': 0.8,
    'filter1/cutoff': 1000
  };

  const engineState = {
    'osc1/frequency': 440, // Match
    'osc1/gain': 0.5,       // Divergence
    'filter1/cutoff': 1200 // Divergence
  };

  // 1. Detection
  console.log('[TEST] Detecting divergence...');
  const divergences = reconciliationService.detectDivergence(uiState, engineState);
  
  if (divergences.length === 2 && divergences.includes('osc1/gain') && divergences.includes('filter1/cutoff')) {
    console.log('[PASSED] Divergence detected correctly.');
  } else {
    console.error('[FAILED] Divergence detection mismatch!', divergences);
    process.exit(1);
  }

  // 2. Resolution (Last-Write-Wins)
  console.log('[TEST] Resolving conflict for osc1/gain (LWW)...');
  const resolution = reconciliationService.resolveConflict('osc1/gain', uiState['osc1/gain'], engineState['osc1/gain'], 'LAST_WRITE_WINS');
  
  if (resolution.resolvedValue === engineState['osc1/gain']) {
    console.log('[PASSED] Conflict resolved via Engine Authority (LWW).');
  } else {
    console.error('[FAILED] Resolution mismatch!', resolution);
    process.exit(1);
  }

  // 3. Resolution (Strict Blocking)
  console.log('[TEST] Resolving conflict for filter1/cutoff (Strict)...');
  const strictResolution = reconciliationService.resolveConflict('filter1/cutoff', uiState['filter1/cutoff'], engineState['filter1/cutoff'], 'STRICT_BLOCKING');
  
  if (strictResolution.resolvedValue === uiState['filter1/cutoff']) {
    console.log('[PASSED] Conflict resolved via UI Authority (Strict).');
  } else {
    console.error('[FAILED] Strict resolution mismatch!', strictResolution);
    process.exit(1);
  }

  console.log('--- RECONCILIATION TEST COMPLETE ---');
}

runReconciliationTest();
