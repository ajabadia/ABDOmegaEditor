import { resolveLayout } from './layoutResolver';
import type { OmegaNode } from '../types/manifest';

console.log('--- STARTING LAYOUT RESOLUTION TEST PHASE 4.4.2 ---');

// Helper to create a valid minimal OmegaNode
const createTestNode = (id: string, kind: 'container' | 'cell', layout: Record<string, unknown>, children: OmegaNode[] = []): OmegaNode => ({
  id,
  kind,
  layout: { pos: { x: 0, y: 0 }, ...layout },
  children
});

// 1. Center Justify Test
const centerTest = createTestNode('root', 'container', {
  size: { width: 200, height: 200 }, 
  mode: 'stack-v', 
  justify: 'center', 
  padding: 0, 
  gap: 0 
}, [
  createTestNode('c1', 'cell', { size: { width: 50, height: 50 } })
]);

const resCenter = resolveLayout(centerTest);
console.log('\n[Justify: Center]');
console.log('Expected: y:75 ( (200 - 50)/2 )');
console.log('Actual:  ', resCenter.children?.[0]?.layout?.pos?.y);

// 2. Space-Between Test
const betweenTest = createTestNode('root', 'container', {
  size: { width: 200, height: 200 }, 
  mode: 'stack-h', 
  justify: 'space-between', 
  padding: 10, 
  gap: 0 
}, [
  createTestNode('c1', 'cell', { size: { width: 40, height: 40 } }),
  createTestNode('c2', 'cell', { size: { width: 40, height: 40 } })
]);

const resBetween = resolveLayout(betweenTest);
console.log('\n[Justify: Space-Between]');
// Container inner = 200 - 20 = 180. Children = 80. Free = 100.
// Gap = 100 / (2-1) = 100.
console.log('Expected Gap: 100');
console.log('C1 x:', resBetween.children?.[0]?.layout?.pos?.x, '(Expected 10)');
console.log('C2 x:', resBetween.children?.[1]?.layout?.pos?.x, '(Expected 150 -> 10 + 40 + 100)');

// 3. Stretch Align Test
const stretchTest = createTestNode('root', 'container', {
  size: { width: 200, height: 200 }, 
  mode: 'stack-v', 
  align: 'stretch', 
  padding: 10 
}, [
  createTestNode('c1', 'cell', { size: { width: 50, height: 50 } })
]);

const resStretch = resolveLayout(stretchTest);
console.log('\n[Align: Stretch]');
console.log('Expected Width: 180 ( 200 - 20 )');
console.log('Actual Width:  ', resStretch.children?.[0]?.layout?.size?.width);

console.log('\n--- TEST COMPLETE ---');
