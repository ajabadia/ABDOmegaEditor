import { CircularityAuditor } from './utils/circularityAuditor.js';
import type { OMEGA_Manifest } from '../types/manifest.js';

console.log('--- STARTING OMEGA CIRCULARITY AUDIT TEST (Phase 17.2/3) ---');

// 1. DAG (Directed Acyclic Graph) - Should PASS
const dagManifest: Partial<OMEGA_Manifest> = {
  modulations: [
    { id: 'mod1', source: 'lfo_1', target: 'osc_1/pitch', amount: 0.5 },
    { id: 'mod2', source: 'osc_1', target: 'vcf_1/cutoff', amount: 0.8 }
  ]
};

const issues1 = CircularityAuditor.validate(dagManifest as OMEGA_Manifest);
console.log('\n[Test 1: DAG]');
console.log('Issues found (Expected 0):', issues1.length);
if (issues1.length === 0) console.log('✅ Test 1 PASSED');

// 2. Simple Cycle (A -> B -> A) - Should FAIL
const simpleCycleManifest: Partial<OMEGA_Manifest> = {
  modulations: [
    { id: 'mod1', source: 'osc_1', target: 'osc_2/fm', amount: 0.5 },
    { id: 'mod2', source: 'osc_2', target: 'osc_1/sync', amount: 0.5 }
  ]
};

const issues2 = CircularityAuditor.validate(simpleCycleManifest as OMEGA_Manifest);
console.log('\n[Test 2: Simple Cycle]');
console.log('Issues found (Expected 1):', issues2.length);
if (issues2.length > 0) {
    const firstIssue = issues2[0];
    console.log('✅ Test 2 PASSED - Issue detected:', firstIssue?.message);
} else {
    console.error('❌ Test 2 FAILED - Cycle not detected');
}

// 3. Complex Cycle (A -> B -> C -> A) - Should FAIL
const complexCycleManifest: Partial<OMEGA_Manifest> = {
  modulations: [
    { id: 'mod1', source: 'node_a', target: 'node_b/in', amount: 0.1 },
    { id: 'mod2', source: 'node_b', target: 'node_c/in', amount: 0.1 },
    { id: 'mod3', source: 'node_c', target: 'node_a/in', amount: 0.1 }
  ]
};

const issues3 = CircularityAuditor.validate(complexCycleManifest as OMEGA_Manifest);
console.log('\n[Test 3: Complex Cycle]');
console.log('Issues found (Expected 1):', issues3.length);
if (issues3.length > 0) {
    const firstIssue = issues3[0];
    console.log('✅ Test 3 PASSED - Issue detected:', firstIssue?.message);
} else {
    console.error('❌ Test 3 FAILED - Cycle not detected');
}

// 4. Path-Based IDs Cycle - Should FAIL
const pathCycleManifest: Partial<OMEGA_Manifest> = {
    modulations: [
      { id: 'mod1', source: 'lfo_1/cv_out', target: 'osc_1/fm_in', amount: 0.5 },
      { id: 'mod2', source: 'osc_1/main_out', target: 'lfo_1/sync_in', amount: 0.5 }
    ]
  };
  
  const issues4 = CircularityAuditor.validate(pathCycleManifest as OMEGA_Manifest);
  console.log('\n[Test 4: Path-Based Cycle]');
  console.log('Issues found (Expected 1):', issues4.length);
  if (issues4.length > 0) {
      const firstIssue = issues4[0];
      console.log('✅ Test 4 PASSED - Issue detected:', firstIssue?.message);
  } else {
      console.error('❌ Test 4 FAILED - Path-based cycle not detected');
  }

// 5. Multi-Level Hierarchical Cycle (Phase 17.3) - Should FAIL
const multiLevelCycleManifest: Partial<OMEGA_Manifest> = {
    modulations: [
      { id: 'mod1', source: 'engine/voice_1/osc_1/out', target: 'engine/fx_1/delay/time', amount: 0.5 },
      { id: 'mod2', source: 'engine/fx_1/delay/feedback', target: 'engine/voice_1/osc_1/fm', amount: 0.5 }
    ]
  };
  
  const issues5 = CircularityAuditor.validate(multiLevelCycleManifest as OMEGA_Manifest);
  console.log('\n[Test 5: Multi-Level Cycle]');
  console.log('Issues found (Expected 1):', issues5.length);
  if (issues5.length > 0) {
      const firstIssue = issues5[0];
      console.log('✅ Test 5 PASSED - Issue detected:', firstIssue?.message);
  } else {
      console.error('❌ Test 5 FAILED - Multi-level cycle not detected');
  }

console.log('\n--- PHASE 17.2/3 TEST COMPLETE ---');
