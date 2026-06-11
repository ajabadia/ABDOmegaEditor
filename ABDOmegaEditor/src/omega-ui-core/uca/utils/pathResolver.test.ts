import { resolvePath, parsePath, normalizeModulationTarget } from './pathResolver.js';

/**
 * PathResolver Unit Tests - Phase 18 Canonical Contract
 */

console.log('--- STARTING PATH RESOLVER HARDENING TESTS ---');

// 1. Hierarchical Resolution
console.log('\n[Test 1: Hierarchical Resolution]');
const r1 = resolvePath('freq', 'voice_1/osc_1');
console.log('voice_1/osc_1 + freq ->', r1);
if (r1 === 'voice_1/osc_1/freq') console.log('✅ 3-level path resolution PASSED');

const r2 = resolvePath('depth', 'mod/lfo_1/target');
console.log('mod/lfo_1/target + depth ->', r2);
if (r2 === 'mod/lfo_1/target/depth') console.log('✅ 4-level path resolution PASSED');

// 2. Genetic Authority (Absolute Paths)
console.log('\n[Test 2: Genetic Authority]');
const r3 = resolvePath('global/master_vol', 'voice_1/osc_1');
console.log('Absolute ID "global/master_vol" in child ->', r3);
if (r3 === 'global/master_vol') console.log('✅ Absolute path preservation PASSED');

// 3. Path Parsing
console.log('\n[Test 3: Path Parsing]');
const p1 = parsePath('synth/v1/osc1/freq');
console.log('Parse "synth/v1/osc1/freq" ->', p1);
if (p1.nodePath === 'synth/v1/osc1' && p1.target === 'freq') {
    console.log('✅ Deep path parsing PASSED');
}

const p2 = parsePath('root_node');
console.log('Parse "root_node" ->', p2);
if (p2.nodePath === 'root_node' && !p2.target) {
    console.log('✅ Root path parsing PASSED');
}

// 4. Modulation Normalization
console.log('\n[Test 4: Modulation Normalization]');
const n1 = normalizeModulationTarget('cutoff', 'synth/v1/filter');
console.log('Normalize "cutoff" in "synth/v1/filter" ->', n1);
if (n1 === 'synth/v1/filter/cutoff') {
    console.log('✅ Modulation target normalization PASSED');
}

const n2 = normalizeModulationTarget('synth/v1/filter/resonance', 'synth/v1/filter');
console.log('Normalize already absolute target ->', n2);
if (n2 === 'synth/v1/filter/resonance') {
    console.log('✅ Absolute modulation target idempotent PASSED');
}

console.log('\n--- PATH RESOLVER TESTS COMPLETE ---');
