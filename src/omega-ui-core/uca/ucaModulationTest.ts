import { blueprintToTree } from './ucaBridge.js';
import type { BlueprintDefinition, OmegaBlueprintNode } from '../types/manifest.js';

console.log('--- STARTING UCA MODULATION & SIGNAL PORT TEST (Phase 17.1) ---');

// 1. Mock Blueprint with Semantic Ports
const mockBlueprint: BlueprintDefinition = {
  blueprintId: 'test_lfo_module',
  version: '1.0.0',
  name: 'Test LFO Module',
  origin: 'system',
  rootNode: {
    id: 'lfo_root',
    kind: 'container',
    role: 'logic-group',
    layout: { pos: { x: 0, y: 0 } },
    // Define module-level ports
    ports: [
      { id: 'cv_out', direction: 'out', signalType: 'cv', label: 'CV Output' }
    ],
    modulationTargets: ['lfo_root/style/color'],
    children: [
      {
        id: 'oscillator',
        kind: 'cell',
        role: 'control',
        layout: { pos: { x: 10, y: 10 } },
        ports: [
          { id: 'freq_in', direction: 'in', signalType: 'cv', label: 'Freq Mod' }
        ],
        modulationTargets: ['oscillator/style/opacity']
      }
    ]
  } as OmegaBlueprintNode,
  placeholders: [],
  compatibility: {}
};

// 2. Compile Blueprint
const result = blueprintToTree(mockBlueprint, {});

console.log('\n[Compilation Metadata]');
console.log('Errors:', result.errors);
console.log('Warnings:', result.warnings);
console.log('Node Count:', result.metadata.nodeCount);

// 3. Verify Materialized Ports
const root = result.tree;
console.log('\n[Root Node Verification]');
console.log('ID:', root.id);
console.log('Root Ports:', JSON.stringify(root.ports, null, 2));

// TEST: Deterministic ID Prefixing
// Expected for root port: 'lfo_root/cv_out'
const rootPortId = root.ports?.[0]?.id;
const expectedRootPortId = 'lfo_root/cv_out';
if (rootPortId === expectedRootPortId) {
    console.log('✅ Root Port ID materialization PASSED');
} else {
    console.error(`❌ Root Port ID mismatch. Expected ${expectedRootPortId}, got ${rootPortId}`);
}

// 4. Verify Child Ports
const child = root.children?.[0];
if (child) {
    console.log('\n[Child Node Verification]');
    console.log('ID:', child.id);
    console.log('Child Ports:', JSON.stringify(child.ports, null, 2));
    
    // Expected for child port: 'oscillator/freq_in'
    const childPortId = child.ports?.[0]?.id;
    const expectedChildPortId = 'oscillator/freq_in';
    if (childPortId === expectedChildPortId) {
        console.log('✅ Child Port ID materialization PASSED');
    } else {
        console.error(`❌ Child Port ID mismatch. Expected ${expectedChildPortId}, got ${childPortId}`);
    }
}

// 5. Verify Modulation Targets
console.log('\n[Modulation Targets Verification]');
console.log('Root Targets:', root.modulationTargets);
console.log('Child Targets:', child?.modulationTargets);

if (root.modulationTargets?.includes('lfo_root/style/color')) {
    console.log('✅ Root Modulation Target PASSED');
}
if (child?.modulationTargets?.includes('oscillator/style/opacity')) {
    console.log('✅ Child Modulation Target PASSED');
}

console.log('\n--- PHASE 17.1 TEST COMPLETE ---');
