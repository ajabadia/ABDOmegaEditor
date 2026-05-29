'use client';
 
import React, { useState, useEffect } from 'react';
import { 
  Database, Cpu, Layers, Layout, 
  Settings2, Trash2, ChevronUp, ChevronDown, Box, Activity, X
} from 'lucide-react';
import { OMEGA_ELEMENT_CATALOG } from '@/omega-ui-core/governance/ElementCatalog';
import { CellRenderer } from '@/omega-ui-core/renderers/CellRenderer';
import type { ManifestEntity, OMEGA_Manifest, ComponentType, AttachmentType, CellTemplate, Attachment, Presentation } from '@/omega-ui-core/types/manifest';
import ThemePaletteGovernance from '../inspector/aesthetic/governance/ThemePaletteGovernance';
import IndustrialGovernanceConsole from '../inspector/shared/IndustrialGovernanceConsole';
import AttachmentTypePrecisionOffsets from '../inspector/attachments/AttachmentPrecisionOffsets';
import AssetBehaviorPresetSelector from './AssetBehaviorPresetSelector';
import BehaviorMappingInspector from './BehaviorMappingInspector';
import LayerRecipeEditor from './LayerRecipeEditor';
import type { AssetBehavior, LayerRecipe } from '@/omega-ui-core/types/assetBehavior';
import { BehaviorResolver } from '@/omega-ui-core/uca/behaviorResolver';
import AssetSelector from '../inspector/shared/AssetSelector';
import { entityToNode } from '@/omega-ui-core/uca/converters/entityToNode';

 
interface CellStudioContainerProps {
  initialCell?: ManifestEntity | undefined;
  manifest?: OMEGA_Manifest | undefined;
  resolveAsset?: ((id: string | undefined) => string | undefined) | undefined;
  onSave: (cell: ManifestEntity) => void;
  onFreeze?: ((template: CellTemplate) => void) | undefined;
  onClose?: (() => void) | undefined;
  isModal?: boolean | undefined;
}
 
export default function CellStudioContainer({
  initialCell,
  manifest,
  resolveAsset,
  onSave,
  onFreeze,
  onClose,
  isModal = false
}: CellStudioContainerProps) {
  const [activeTab, setActiveTab] = useState<'fragments' | 'properties' | 'behavior' | 'recipes'>('fragments');
  const [selectedFragmentId, setSelectedFragmentId] = useState<string>('host');
  const [soloLayerId, setSoloLayerId] = useState<string | null>(null);
  const [isAssetSelectorOpen, setIsAssetSelectorOpen] = useState(false);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [isTypeLocked, setIsTypeLocked] = useState(!!initialCell);
  const [isCommandCenterOpen, setIsCommandCenterOpen] = useState(false);
 
  const [behavior, setBehavior] = useState<AssetBehavior>(initialCell?.assetBehavior || {
    preset: 'rotary',
    source: 'asset',
    mapping: {
      input: 'value',
      mode: 'continuous',
      polarity: 'normal'
    }
  });
 
  const [recipe, setRecipe] = useState<LayerRecipe>(initialCell?.recipe || {
    id: 'new_recipe',
    name: 'New Composite Recipe',
    layers: []
  });
 
  const [cellData, setCellData] = useState<ManifestEntity>(initialCell || {
    id: 'new_cell',
    type: 'knob',
    role: 'control',
    bind: 'param_id',
    label: 'New Universal Cell',
    pos: { x: 0, y: 0 },
    size: { width: 48, height: 48 },
    presentation: {
      tab: 'MAIN',
      component: 'knob',
      variant: 'B_cyan',
      offsetX: 0,
      offsetY: 0,
      style: {
        asset: '',
        color: '#00f2ff',
        indicatorColor: '#00f2ff',
        fitting: 'contain'
      },
      attachments: []
    }
  });
 
  const [description] = useState('');
 
  // MOCK MANIFEST FOR RENDERER (Era 7.2.3 Industrial Palette)
  const [mockManifest, setMockManifest] = useState<OMEGA_Manifest>(manifest || {
    schemaVersion: '1.0.0',
    id: 'laboratory',
    metadata: { name: 'Laboratory', family: 'Internal', version: '1.0.0', author: 'OMEGA' },
    ui: {
      dimensions: { width: 100, height: 100 },
      controls: [],
      jacks: [],
      layout: { width: 100, height: 100, containers: [], planes: ['MAIN'], tabStyles: {} },
      styles: {},
      skinMode: 'custom',
      palette: {
        primary: '#00f2ff', secondary: '#ff8c00', utility: '#a0a0a0', feedback: '#32cd32',
        hardware: '#777777', chassis: '#1a1a1a', glow: '#00f2ff', glass: 'rgba(255,255,255,0.05)',
        warning: '#ff3300', highlight: '#ffffff'
      },
      colors: { accent: '#00f2ff', surface: '#121416', text: '#ffffff', weak: '#555555' }
    },
    resources: { wasm: 'internal', assets: [] },
    entities: []
  });
 
  useEffect(() => {
    if (cellData.presentation && cellData.type !== cellData.presentation.component) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCellData(prev => ({
        ...prev,
        presentation: {
          tab: 'MAIN',
          variant: 'standard',
          offsetX: 0,
          offsetY: 0,
          attachments: [],
          ...prev.presentation,
          component: prev.type as ComponentType
        }
      }));
    }
  }, [cellData.type, cellData.presentation?.component, cellData.presentation]);
 
  const addFragment = (type: string) => {
    setIsTypeLocked(true);
    const newFragment = {
      id: `fragment_${Date.now()}`,
      position: 'center' as const,
      type: type as AttachmentType,
      variant: 'default',
      style: { color: '#ffffff', fontSize: 10, font: 'Inter' },
      offsetX: 0,
      offsetY: 0
    };
    
    setCellData(prev => ({
      ...prev,
      presentation: {
        tab: prev.presentation?.tab || 'MAIN',
        component: prev.presentation?.component || (prev.type as ComponentType) || 'knob',
        variant: prev.presentation?.variant || 'standard',
        offsetX: prev.presentation?.offsetX || 0,
        offsetY: prev.presentation?.offsetY || 0,
        ...prev.presentation,
        attachments: [...(prev.presentation?.attachments || []), newFragment as unknown as Attachment]
      } as Presentation
    }));
    setSelectedFragmentId(newFragment.id);
    setActiveTab('properties');
  };
 
  const removeFragment = (id: string) => {
    setCellData(prev => ({
      ...prev,
      presentation: {
        tab: prev.presentation?.tab || 'MAIN',
        component: prev.presentation?.component || (prev.type as ComponentType) || 'knob',
        variant: prev.presentation?.variant || 'standard',
        offsetX: prev.presentation?.offsetX || 0,
        offsetY: prev.presentation?.offsetY || 0,
        ...prev.presentation,
        attachments: (prev.presentation?.attachments || []).filter((a) => a.id !== id)
      } as Presentation
    }));
    if (selectedFragmentId === id) setSelectedFragmentId('host');
  };
 
  const moveFragment = (id: string, direction: 'up' | 'down') => {
    const attachments = [...(cellData.presentation?.attachments || [])];
    const index = attachments.findIndex(a => a.id === id);
    if (index === -1) return;
 
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= attachments.length) return;
 
    const [moved] = attachments.splice(index, 1);
    attachments.splice(newIndex, 0, moved);
 
    setCellData(prev => ({
      ...prev,
      presentation: { 
        tab: prev.presentation?.tab || 'MAIN',
        component: prev.presentation?.component || (prev.type as ComponentType) || 'knob',
        variant: prev.presentation?.variant || 'standard',
        offsetX: prev.presentation?.offsetX || 0,
        offsetY: prev.presentation?.offsetY || 0,
        ...prev.presentation, 
        attachments 
      } as Presentation
    }));
  };
 
  const updateFragment = (id: string, updates: Record<string, unknown>) => {
    if (id === 'host') {
      setCellData(prev => ({
        ...prev,
        presentation: {
          tab: prev.presentation?.tab || 'MAIN',
          component: prev.presentation?.component || (prev.type as ComponentType) || 'knob',
          variant: prev.presentation?.variant || 'standard',
          offsetX: prev.presentation?.offsetX || 0,
          offsetY: prev.presentation?.offsetY || 0,
          ...prev.presentation,
          style: { ...(prev.presentation?.style || {}), ...updates }
        } as Presentation
      }));
    } else {
      const styleKeys = [
        'color', 'indicatorColor', 'glowColor', 'glassColor', 'font', 'fontSize', 
        'fontColor', 'opacity', 'intensity', 'rounding', 'shadow', 'blur', 'texture'
      ];
 
      setCellData(prev => {
        const attachments = (prev.presentation?.attachments || []).map((a) => {
          if (a.id !== id) return a;
          const rootUpdates: Record<string, unknown> = {};
          const styleUpdates: Record<string, unknown> = {};
          Object.keys(updates).forEach(key => {
            if (styleKeys.includes(key)) styleUpdates[key] = updates[key];
            else rootUpdates[key] = updates[key];
          });
          const newAttachment = { ...a, ...rootUpdates };
          if (Object.keys(styleUpdates).length > 0) {
            newAttachment.style = { ...(a.style || {}), ...styleUpdates };
          }
          return newAttachment;
        });
        return { 
          ...prev, 
          presentation: { 
            tab: prev.presentation?.tab || 'MAIN',
            component: prev.presentation?.component || (prev.type as ComponentType) || 'knob',
            variant: prev.presentation?.variant || 'standard',
            offsetX: prev.presentation?.offsetX || 0,
            offsetY: prev.presentation?.offsetY || 0,
            ...prev.presentation, 
            attachments 
          } as Presentation 
        };
      });
    }
  };
 
  const testValue = (cellData.presentation?.style as Record<string, unknown>)?.testValue as number ?? 0.75;
  const resolved = BehaviorResolver.resolve(testValue, {
    ...behavior,
    frameCount: (behavior.mapping?.frameRange?.end || 0) - (behavior.mapping?.frameRange?.start || 0) + 1
  });
 
  const previewHTML = React.useMemo(() => {
    try {
      return CellRenderer.renderCellHTML(entityToNode(cellData), {
        zoom: 2.5,
        runtimeValue: testValue,
        forceFrame: resolved.frame,
        steps: 128,
        skin: (mockManifest.ui as OMEGA_Manifest['ui'] & { skin?: string })?.skin || 'standard',
        manifest: mockManifest,
        resolveAsset: resolveAsset || ((id) => id),
        recipe: soloLayerId 
          ? { ...recipe, layers: recipe.layers.filter(l => l.id === soloLayerId) }
          : recipe
      });
    } catch (e) {
      return `<div class="p-4 text-[8px] text-red-500 font-mono">RENDER_ERROR: ${e}</div>`;
    }
  }, [cellData, mockManifest, resolveAsset, recipe, soloLayerId, testValue, resolved.frame]);
 
  const handleExport = () => {
    const exportData = {
      ...cellData,
      description,
      assetBehavior: behavior,
      recipe: recipe,
      meta: { exportedAt: new Date().toISOString(), version: 'Era 7.2.3' }
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omega_cell_${cellData.type}_${(cellData.label || 'unnamed').toLowerCase().replace(/\s+/g, '_')}.json`;
    a.click();
  };
 
  const handleFreeze = () => {
    const dna = entityToNode(cellData);
    const template: CellTemplate = {
      id: cellData.id,
      label: cellData.label || 'Unnamed DNA',
      category: (cellData.role as CellTemplate['category']) || 'control',
      baseNode: dna,
      assetBehavior: behavior,
      recipe: recipe,
      version: '1.0.0',
      description: description || 'Certified UCA Cell Template'
    };
    
    if (onFreeze) {
      onFreeze(template);
    } else {
      // Fallback: download as well if no callback
      const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template_${template.id}.json`;
      a.click();
    }
  };
 
  return (
    <div className={`flex flex-col h-full bg-[#0c0c0d] overflow-hidden text-[#a0a0a0] ${isModal ? '' : 'rounded-lg border border-[#222]'}`}>
      {/* HEADER (ASEPTIC STRIP) */}
      <div className="p-4 border-b border-[#222] flex items-center justify-between bg-[#111112]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-[#1a1a1b] border border-[#333] flex items-center justify-center">
            <Cpu className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white">Universal Cell Studio</h2>
            <div className="flex items-center gap-2">
              <span className="text-[7px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full font-black uppercase">Phase 15 Isolation</span>
              <span className="text-[7px] opacity-40 font-bold uppercase tracking-widest">Era 7.2.3 Industrial Logic</span>
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-8 h-8 rounded-full border border-[#333] flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-500 transition-all">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
 
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: PREVIEW STRIP */}
        <div className="w-96 border-r border-[#222] bg-[#080809] flex flex-col relative overflow-hidden">
          <div className="p-4 border-b border-[#222] bg-[#111112]">
            <span className="text-[8px] font-black uppercase tracking-widest opacity-40">DNA Real-time View</span>
          </div>
          
          <div className="flex-1 flex items-center justify-center relative bg-[radial-gradient(circle_at_center,_#111_0%,_transparent_70%)] group">
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '16px 16px' }} />
            <div className={`scale-[1.2] relative transition-all duration-700 ${testValue !== 0.75 ? 'drop-shadow-[0_0_30px_rgba(0,242,255,0.2)]' : ''}`}>
              <div dangerouslySetInnerHTML={{ __html: previewHTML }} />
            </div>
 
            {/* SCRUBBING UI */}
            <div className="absolute bottom-4 left-4 right-4 bg-[#1a1a1b]/90 backdrop-blur-md border border-white/5 p-3 rounded-lg flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
              <div className="flex items-center justify-between">
                <span className="text-[6px] font-black uppercase tracking-widest text-accent flex items-center gap-1">
                  <Activity className={`w-2.5 h-2.5 ${testValue !== 0.75 ? 'animate-pulse' : ''}`} /> Behavior Scrubber
                </span>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateFragment('host', { testValue: 0.75 })} className="text-[6px] font-black uppercase text-white/20 hover:text-white/60">RESET</button>
                  <span className="text-[7px] font-mono text-white/40">{(testValue * 100).toFixed(1)}%</span>
                </div>
              </div>
              <input 
                type="range" min="0" max="1" step="0.001" 
                value={testValue}
                onChange={(e) => updateFragment('host', { testValue: parseFloat(e.target.value) })}
                className="w-full h-1 bg-white/10 rounded-full appearance-none accent-accent cursor-pointer"
              />
            </div>
          </div>
        </div>
 
        {/* CENTER: WORKSPACE */}
        <div className="flex-1 flex flex-col bg-[#0c0c0d] overflow-hidden">
          <div className="p-6 border-b border-[#222] bg-[#111112]/50 flex items-center justify-between gap-8">
            <div className="flex-1 space-y-4">
              <input 
                type="text" value={cellData.label || ''} 
                onChange={(e) => setCellData({...cellData, label: e.target.value})}
                className="bg-transparent text-xl font-black uppercase tracking-tighter text-white outline-none w-full border-b border-transparent focus:border-accent/40 placeholder:opacity-20"
                placeholder="CELL IDENTITY NAME"
              />
              <div className="flex items-center gap-4">
                <div className="w-64">
                  <span className="text-[7px] font-black uppercase tracking-widest opacity-40 block mb-1">Master Class</span>
                  <select 
                    disabled={isTypeLocked} value={cellData.type}
                    onChange={(e) => setCellData({ ...cellData, type: e.target.value })}
                    className="w-full bg-[#1a1a1b] border border-[#333] rounded p-1.5 text-[8px] font-black uppercase text-accent outline-none"
                  >
                    {['signal', 'io', 'telemetry', 'mechanical', 'infrastructure', 'rack', 'decor'].map(cat => (
                      <optgroup key={cat} label={cat.toUpperCase()} className="bg-[#0a0a0b] text-white/40">
                        {OMEGA_ELEMENT_CATALOG.filter(e => e.category === cat).map(el => (
                          <option key={el.id} value={el.id}>{el.icon} {el.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
            </div>
 
            <div className="flex items-center gap-1 bg-[#1a1a1b] p-1 rounded border border-[#333]">
              {[
                { id: 'fragments', icon: Layers, label: 'Fragments' },
                { id: 'behavior', icon: Activity, label: 'Behavior' },
                { id: 'recipes', icon: Layers, label: 'Recipes' },
                { id: 'properties', icon: Settings2, label: 'Properties' }
              ].map(t => (
                <button 
                  key={t.id}
                  onClick={() => { setActiveTab(t.id as 'fragments' | 'behavior' | 'recipes' | 'properties'); setIsCommandCenterOpen(false); }}
                  className={`px-4 py-1.5 rounded text-[8px] font-black uppercase transition-all ${activeTab === t.id && !isCommandCenterOpen ? 'bg-accent text-black shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                >
                  <t.icon className="w-3 h-3 inline-block mr-2" /> {t.label}
                </button>
              ))}
            </div>
          </div>
 
          <div className="flex-1 overflow-y-auto p-6">
            {isCommandCenterOpen ? (
              <ThemePaletteGovernance 
                manifest={mockManifest}
                onUpdate={(updates) => setMockManifest(prev => ({ ...prev, ui: { ...prev.ui, ...updates.ui } }))}
              />
            ) : activeTab === 'fragments' ? (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between border-b border-[#222] pb-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Cell Composition Tree</h3>
                  <select 
                    onChange={(e) => { if(e.target.value) addFragment(e.target.value); e.target.value = ''; }}
                    className="bg-accent/10 border border-accent/30 rounded px-3 py-1.5 text-[8px] font-black uppercase text-accent outline-none"
                  >
                    <option value="" className="bg-[#111]">+ Add Fragment</option>
                    {OMEGA_ELEMENT_CATALOG.filter(e => e.attachmentRole === 'fragment' || e.attachmentRole === 'both').map(frag => (
                      <option key={frag.id} value={frag.id}>{frag.label.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <div 
                    onClick={() => { setSelectedFragmentId('host'); setActiveTab('properties'); }}
                    className={`p-4 rounded-lg border flex items-center gap-4 cursor-pointer transition-all ${selectedFragmentId === 'host' ? 'bg-accent/5 border-accent' : 'bg-[#111112] border-[#222]'}`}
                  >
                    <Box className="w-6 h-6 text-accent" />
                    <div className="flex-1">
                      <h4 className="text-[10px] font-black uppercase text-white">Main Host</h4>
                      <p className="text-[7px] font-bold uppercase opacity-30">Surface & Body</p>
                    </div>
                  </div>
                  {(cellData.presentation?.attachments || []).map(frag => (
                    <div 
                      key={frag.id}
                      onClick={() => { setSelectedFragmentId(frag.id); setActiveTab('properties'); }}
                      className={`p-4 rounded-lg border flex items-center gap-4 cursor-pointer transition-all ${selectedFragmentId === frag.id ? 'bg-accent/5 border-accent' : 'bg-[#111112] border-[#222]'}`}
                    >
                      <div className="flex flex-col gap-1">
                        <button onClick={(e) => { e.stopPropagation(); moveFragment(frag.id, 'up'); }}><ChevronUp className="w-3 h-3" /></button>
                        <button onClick={(e) => { e.stopPropagation(); moveFragment(frag.id, 'down'); }}><ChevronDown className="w-3 h-3" /></button>
                      </div>
                      <Layout className="w-5 h-5 opacity-40" />
                      <div className="flex-1">
                        <h4 className="text-[10px] font-black uppercase text-white">{frag.type}</h4>
                        <span className="text-[6px] font-mono opacity-20">#{frag.id.slice(-4)}</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); removeFragment(frag.id); }} className="text-red-500/40 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeTab === 'behavior' ? (
              <div className="max-w-3xl mx-auto space-y-8">
                <AssetBehaviorPresetSelector value={behavior.preset} onChange={(p) => setBehavior(prev => ({ ...prev, preset: p }))} />
                <BehaviorMappingInspector 
                  mapping={behavior.mapping!} resolvedFrame={resolved.frame}
                  onChange={(updates) => setBehavior(prev => ({ ...prev, mapping: { ...prev.mapping!, ...updates } }))}
                />
              </div>
            ) : activeTab === 'recipes' ? (
              <LayerRecipeEditor 
                recipe={recipe} onChange={(updates) => setRecipe(prev => ({ ...prev, ...updates }))}
                onSelectAsset={(layerId) => { setActiveLayerId(layerId); setIsAssetSelectorOpen(true); }}
                soloLayerId={soloLayerId} onSoloChange={setSoloLayerId}
              />
            ) : (
              <div className="max-w-4xl mx-auto space-y-8">
                <IndustrialGovernanceConsole 
                  type={selectedFragmentId === 'host' ? cellData.type as string : ((cellData.presentation?.attachments || []).find(f => f.id === selectedFragmentId)?.type || 'label')}
                  values={selectedFragmentId === 'host' ? (cellData.presentation?.style || {}) : ((cellData.presentation?.attachments || []).find(f => f.id === selectedFragmentId)?.style || {})}
                  onUpdate={(updates) => updateFragment(selectedFragmentId, updates)}
                  manifest={mockManifest} resolveAsset={resolveAsset || ((id) => id)}
                  onOpenConfig={() => setIsCommandCenterOpen(true)}
                  title={selectedFragmentId === 'host' ? 'Host Aesthetic Governance' : 'Fragment Aesthetic Governance'}
                />
                {selectedFragmentId !== 'host' && (
                  <AttachmentTypePrecisionOffsets 
                    offsetX={(cellData.presentation?.attachments || []).find(f => f.id === selectedFragmentId)?.offsetX || 0}
                    offsetY={(cellData.presentation?.attachments || []).find(f => f.id === selectedFragmentId)?.offsetY || 0}
                    onUpdate={(updates) => updateFragment(selectedFragmentId, updates)}
                  />
                )}
              </div>
            )}
          </div>
 
          <div className="p-4 border-t border-[#222] bg-[#111112] flex items-center justify-end gap-2">
            <button onClick={() => navigator.clipboard.writeText(JSON.stringify({ behavior, recipe }, null, 2))} className="px-6 py-2 bg-[#1a1a1b] border border-[#333] rounded text-[9px] font-black uppercase">Copy DNA</button>
            <button onClick={handleExport} className="px-6 py-2 bg-[#1a1a1b] border border-[#333] rounded text-[9px] font-black uppercase">Export Entity</button>
            <button onClick={handleFreeze} className="px-6 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-[9px] font-black uppercase flex items-center gap-2 hover:bg-blue-500/20 transition-all">
              <Database className="w-3 h-3" /> Freeze as DNA Template
            </button>
            <button onClick={() => onSave({ ...cellData, assetBehavior: behavior, recipe })} className="px-8 py-2 bg-accent text-black rounded text-[9px] font-black uppercase ml-4">Finalize Cell</button>
          </div>
        </div>
      </div>
 
      {/* ASSET SELECTOR OVERLAY */}
      {isAssetSelectorOpen && (
        <>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="w-[800px] h-[600px] bg-[#111112] border border-[#333] rounded-2xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-[#222] flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-accent">Select Layer Asset</h3>
                <button onClick={() => setIsAssetSelectorOpen(false)}><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1">
                <AssetSelector 
                  manifest={mockManifest} resolveAsset={resolveAsset || ((id) => id)} restrictToSequences={true}
                  onSelect={(assetId) => {
                    if (activeLayerId && assetId) {
                      setRecipe(prev => ({
                        ...prev,
                        layers: prev.layers.map(l => l.id === activeLayerId ? { ...l, assetId: assetId as string } : l)
                      }));
                    }
                    setIsAssetSelectorOpen(false);
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
