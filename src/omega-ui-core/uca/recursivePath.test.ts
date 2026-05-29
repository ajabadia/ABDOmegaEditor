import { blueprintToTree } from './ucaBridge.js';
import type { BlueprintDefinition, OmegaBlueprintNode } from '../types/manifest.js';

console.log('--- STARTING RECURSIVE HIERARCHY TEST (Phase 17.3 - Extended) ---');

// 1. Nested Blueprint Mock
const nestedBlueprint: BlueprintDefinition = {
  blueprintId: 'voice_module',
  version: '1.0.0',
  name: 'Voice Module',
  origin: 'system',
  rootNode: {
    id: 'voice_1',
    kind: 'container',
    role: 'logic-group',
    layout: { pos: { x: 0, y: 0 } },
    children: [
      {
        id: 'osc_1',
        kind: 'container',
        role: 'logic-group',
        children: [
          {
            id: 'frequency_cell',
            kind: 'cell',
            role: 'control',
            ports: [
              { id: 'freq_in', direction: 'in', signalType: 'cv', label: 'Frequency In' }
            ],
            modulationTargets: ['freq_in'] // Relative target
          } as OmegaBlueprintNode
        ]
      } as OmegaBlueprintNode
    ]
  } as OmegaBlueprintNode,
  placeholders: [],
  compatibility: {}
};

// 2. Compile
const result = blueprintToTree(nestedBlueprint, {});

// 3. Verify IDs
const root = result.tree;
const mid = root.children?.[0];
const leaf = mid?.children?.[0];

console.log('\n[ID Verification]');
console.log('Root ID (Expected voice_1):', root.id);
console.log('Mid ID (Expected voice_1/osc_1):', mid?.id);
console.log('Leaf ID (Expected voice_1/osc_1/frequency_cell):', leaf?.id);

if (leaf?.id === 'voice_1/osc_1/frequency_cell') {
    console.log('✅ Hierarchical ID prefixing PASSED');
}

// 4. Verify Port IDs
const portId = leaf?.ports?.[0]?.id;
console.log('\n[Port Verification]');
console.log('Leaf Port ID (Expected voice_1/osc_1/frequency_cell/freq_in):', portId);

if (portId === 'voice_1/osc_1/frequency_cell/freq_in') {
    console.log('✅ Deep Port addressing PASSED');
}

// 5. Verify Modulation Targets
const target = leaf?.modulationTargets?.[0];
console.log('\n[Modulation Target Verification]');
console.log('Leaf Modulation Target (Expected voice_1/osc_1/frequency_cell/freq_in):', target);

if (target === 'voice_1/osc_1/frequency_cell/freq_in') {
    console.log('✅ Deep Modulation Target prefixing PASSED');
}

// EDGE CASE 1: Absolute ID (Genetic Authority)
console.log('\n[Edge Case 1: Absolute Root ID]');
const absoluteBlueprint: BlueprintDefinition = {
    ...nestedBlueprint,
    rootNode: {
        ...nestedBlueprint.rootNode,
        id: '/global/voice_0' // Absolute ID
    }
};
const resultAbs = blueprintToTree(absoluteBlueprint, {});
console.log('Absolute Root ID (Expected /global/voice_0):', resultAbs.tree.id);
if (resultAbs.tree.id === '/global/voice_0') {
    console.log('✅ Absolute ID preservation PASSED');
}

// EDGE CASE 2: Child with Absolute ID
console.log('\n[Edge Case 2: Absolute Child ID]');
const childAbsBlueprint: BlueprintDefinition = {
    ...nestedBlueprint,
    rootNode: {
        ...nestedBlueprint.rootNode,
        children: [
            {
                ...nestedBlueprint.rootNode.children![0],
                id: '/shared/osc_common', // Child with absolute ID
                kind: 'container'
            }
        ]
    }
};
const resultChildAbs = blueprintToTree(childAbsBlueprint, {});
const absChild = resultChildAbs.tree.children?.[0];
console.log('Absolute Child ID (Expected /shared/osc_common):', absChild?.id);
if (absChild?.id === '/shared/osc_common') {
    console.log('✅ Absolute Child ID preservation PASSED');
}

console.log('\n--- PHASE 17.3 TEST COMPLETE ---');
