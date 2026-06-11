import { observabilityService } from './observabilityService';

/**
 * PHASE 20.5 - OBSERVABILITY TEST
 * Verifies that structured logs and correlation IDs work as expected.
 */
function runObservabilityTest() {
  console.log('--- STARTING PHASE 20.5 OBSERVABILITY TEST ---');

  const correlationId = observabilityService.generateCorrelationId();
  console.log(`[TEST] Generated Correlation ID: ${correlationId}`);

  // 1. Trace a successful lifecycle
  observabilityService.trackEvent({
    correlationId,
    phase: 'TEST_PHASE',
    component: 'TEST_COMPONENT',
    state: 'START',
    message: 'Test start'
  });

  observabilityService.trackEvent({
    correlationId,
    phase: 'TEST_PHASE',
    component: 'TEST_COMPONENT',
    state: 'SUCCESS',
    durationMs: 42,
    message: 'Test success'
  });

  // 2. Trace a failure + rollback
  const failId = observabilityService.generateCorrelationId();
  observabilityService.trackEvent({
    correlationId: failId,
    phase: 'TEST_PHASE',
    component: 'TEST_COMPONENT',
    state: 'FAILURE',
    code: 'ERR_TIMEOUT',
    message: 'Simulated timeout failure'
  });

  observabilityService.trackEvent({
    correlationId: failId,
    phase: 'TEST_PHASE',
    component: 'TEST_COMPONENT',
    state: 'ROLLBACK',
    message: 'Cleanup performed'
  });

  // 3. Verify Health Report
  const health = observabilityService.getHealthReport();
  console.log('[TEST] Current Health Report:', JSON.stringify(health, null, 2));

  if (health.failureCount === 1 && health.rollbackCount === 1) {
    console.log('[PASSED] Observability metrics are accurate.');
  } else {
    console.error('[FAILED] Metrics mismatch!');
    process.exit(1);
  }

  console.log('--- OBSERVABILITY TEST COMPLETE ---');
}

runObservabilityTest();
