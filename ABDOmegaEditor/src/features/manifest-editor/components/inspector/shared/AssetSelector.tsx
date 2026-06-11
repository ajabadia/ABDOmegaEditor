'use client';

import React from 'react';
import { Image as ImageIcon, Plus, Trash2, Folder, ChevronLeft, Film } from 'lucide-react';
import Image from 'next/image';
import type { OMEGA_Manifest, LibraryAsset, OmegaStyleNode, OMEGA_Asset } from '@/omega-ui-core/types/manifest';
import SequenceIngestionLab from './aesthetic/SequenceIngestionLab';
import { useAssetRegistry } from '@/features/manifest-editor/hooks/useAssetRegistry';

type UploadBridge = (f: File[], cb: (id: string) => void) => void;

export interface AssetSelectionMetadata extends Partial<OmegaStyleNode> {
  id?: string | undefined;
  name?: string | undefined;
  path?: string | undefined;
  isFolder?: boolean | undefined;
}

interface AssetSelectorProps {
  manifest: OMEGA_Manifest;
  selectedAssetId?: string | undefined;
  onSelect: (assetId: string | undefined, metadata?: AssetSelectionMetadata | undefined) => void;
  label?: string | undefined;
  resolveAsset: (id: string | undefined) => string | undefined;
  initialPath?: string | undefined;
  restrictToSequences?: boolean | undefined;
}

export default function AssetSelector({ 
  manifest, 
  selectedAssetId, 
  onSelect, 
  label = 'Branding Asset',
  resolveAsset,
  initialPath,
  restrictToSequences
}: AssetSelectorProps) {
  const { library, assets } = useAssetRegistry(manifest, restrictToSequences ? 'sequences' : 'statics');
  const [currentPath, setCurrentPath] = React.useState<string | null>(initialPath || null);
  const [pendingSequenceFiles, setPendingSequenceFiles] = React.useState<File[] | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // VIRTUAL FILE SYSTEM LOGIC
  const folders = React.useMemo(() => {
    const map = new Map<string, AssetSelectionMetadata[]>();
    const subfolders = new Map<string, Set<string>>();

    if (library.length > 0) {
      const modeKey = restrictToSequences ? 'sequences' : 'statics';
      const items = library;
      const rootKey = `lib:${modeKey}`;
      if (!map.has(rootKey)) map.set(rootKey, []);
      if (!subfolders.has(rootKey)) subfolders.set(rootKey, new Set());

      items.forEach((item: LibraryAsset) => {
        const path = item.path || item.id;
        const pathMarker = `/${modeKey}/`;
        const pathParts = path.split(pathMarker);
        
        if (pathParts.length > 1) {
          const relativePath = pathParts[1];
          const folderParts = relativePath.split('/');
          
          if (folderParts.length > 1) {
            const folderName = folderParts[0];
            const fullFolderKey = `${rootKey}/${folderName}`;
            subfolders.get(rootKey)?.add(fullFolderKey);
            
            let currentParent = rootKey;
            for (let i = 0; i < folderParts.length - 1; i++) {
              const fName = folderParts[i];
              const fKey = `${currentParent}/${fName}`;
              if (!map.has(fKey)) map.set(fKey, []);
              if (!subfolders.has(fKey)) subfolders.set(fKey, new Set());
              
              if (i > 0) {
                subfolders.get(currentParent)?.add(fKey);
              }
              currentParent = fKey;
            }
            map.get(currentParent)?.push(item as unknown as AssetSelectionMetadata);
          } else {
            map.get(rootKey)?.push(item as unknown as AssetSelectionMetadata);
          }
        } else {
          map.get(rootKey)?.push(item as unknown as AssetSelectionMetadata);
        }
      });
    }

    // Process local manifest assets
    assets.forEach((asset: OMEGA_Asset) => {
      const isSequenceAsset = asset.id.includes('sequences');
      if (restrictToSequences && !isSequenceAsset) return;
      if (!restrictToSequences && isSequenceAsset) return;

      const parts = asset.id.split('/');
      const folderName = parts.length > 1 ? parts[0] : 'root';
      if (!map.has(folderName)) map.set(folderName, []);
      const existing = map.get(folderName);
      if (existing) existing.push({ 
        id: asset.id, 
        name: asset.id.split('/').pop() || 'Untitled', 
        path: resolveAsset(asset.id),
      } as unknown as AssetSelectionMetadata);
    });

    // Merge subfolders into the map as "Folder Objects" for the UI to render
    subfolders.forEach((children, parentKey) => {
      const folderItems = map.get(parentKey) || [];
      children.forEach(childKey => {
        // Add a virtual folder item
        folderItems.unshift({
          id: childKey,
          name: childKey.split('/').pop()?.toUpperCase(),
          isFolder: true,
          path: childKey
        });
      });
      map.set(parentKey, folderItems);
    });

    return map;
  }, [assets, library, restrictToSequences, resolveAsset]);

  // Effect to force navigation in restricted mode (Only if lost)
  React.useEffect(() => {
    const isInsideRestrictedTree = currentPath?.startsWith(initialPath || '');
    if (restrictToSequences && initialPath && (!currentPath || currentPath === 'lib:sequences' || !isInsideRestrictedTree)) {
      requestAnimationFrame(() => setCurrentPath(initialPath));
    }
  }, [restrictToSequences, initialPath, currentPath]);

  const handleLibrarySelect = async (item: AssetSelectionMetadata) => {
    // Aseptic Ingestion Logic
    try {
      const path = item.path as string;
      const response = await fetch(path);
      const blob = await response.blob();
      const file = new File([blob], path.split('/').pop() || 'asset', { type: blob.type });
      
      const uploadBridge = (window as unknown as Record<string, unknown>).triggerAssetUpload as ((f: File[], cb: (id: string) => void) => void) | undefined;
      if (uploadBridge) {
        uploadBridge([file], (assetId: string) => onSelect(assetId, item));
      }
    } catch (err) {
      console.error("Failed to ingest library asset:", err);
    }
  };

  const isAtRoot = !currentPath || (restrictToSequences && currentPath === initialPath) || currentPath === 'lib:sequences';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between h-5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-accent/10 border border-accent/20 rounded-xs">
               {restrictToSequences ? <Film className="w-2.5 h-2.5 text-accent" /> : <ImageIcon className="w-2.5 h-2.5 text-primary" />}
               <span className="text-[8px] text-white font-black uppercase tracking-widest">{label}</span>
            </div>
          </div>
          
          {selectedAssetId && (
            <button 
                onClick={() => onSelect(undefined)}
                className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded-[2px] text-[6px] font-black uppercase text-red-500 hover:bg-red-500/20 transition-all"
            >
               <Trash2 className="w-2 h-2" />
               Clear Asset
            </button>
          )}
      </div>

      <div className="wb-surface-strong border wb-outline rounded-xs p-3 min-h-[240px] max-h-[320px] overflow-y-auto industrial-scrollbar">
        <div className="grid grid-cols-3 gap-2">
           {!isAtRoot && (
             <button
               onClick={() => {
                 const parts = currentPath?.split('/') || [];
                 parts.pop();
                 setCurrentPath(parts.length > 0 ? parts.join('/') : null);
               }}
               className="p-2 rounded-xs border wb-outline bg-black/40 flex flex-col gap-2 items-center justify-center hover:border-primary/40 transition-all group min-h-[80px]"
             >
               <ChevronLeft className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" />
               <span className="text-[6px] font-black uppercase tracking-widest text-foreground/40">Back</span>
             </button>
           )}

           {!currentPath && (
             <button
               onClick={() => setCurrentPath('lib:sequences')}
               className="p-2 rounded-xs border wb-outline bg-black/40 flex flex-col gap-2 items-center justify-center hover:border-accent/40 transition-all group min-h-[100px]"
             >
               <Film className="w-5 h-5 text-accent/40 group-hover:text-accent transition-colors" />
               <span className="text-[6px] font-black uppercase tracking-[0.2em] text-foreground/60">System Library</span>
             </button>
           )}

        {!currentPath && Array.from(folders.keys()).filter(k => k !== 'root' && !k.startsWith('lib:')).map(folderName => (
          <button
            key={folderName}
            onClick={() => {
              setCurrentPath(folderName);
            }}
            className="p-2 rounded-xs border wb-outline bg-black/40 flex flex-col gap-2 items-center justify-center hover:border-accent/40 transition-all group min-h-[100px]"
          >
            <Folder className="w-5 h-5 text-accent/40 group-hover:text-accent transition-colors" />
            <span className="text-[6px] font-black uppercase tracking-[0.2em] text-foreground/60">{folderName.toUpperCase()}</span>
          </button>
        ))}

        {currentPath?.startsWith('lib:') ? (
           // RENDER PHYSICAL LIBRARY ITEMS
            (folders.get(currentPath) || [])
              .map((item: AssetSelectionMetadata) => {
              if (item.isFolder) {
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPath(item.path || null)}
                    className="p-2 rounded-xs border wb-outline bg-black/40 flex flex-col gap-2 items-center justify-center transition-all group min-h-[80px] hover:border-primary/40"
                  >
                    <Folder className="w-5 h-5 text-primary/40 group-hover:text-primary transition-colors" />
                    <span className="text-[6px] font-black uppercase tracking-[0.2em] text-foreground/60">{item.name}</span>
                  </button>
                );
              }

              const isSequence = (item.frames as number) > 1 || currentPath.includes('sequences');
              return (
                <button
                  key={item.id}
                  onClick={() => handleLibrarySelect(item)}
                  className="p-2 rounded-xs border wb-outline bg-black/40 flex flex-col gap-1 items-center transition-all group overflow-hidden min-h-[80px] hover:border-primary/40"
                >
                  <div className="w-full flex-1 bg-black/60 rounded-xs flex items-center justify-center overflow-hidden border border-white/5 relative aspect-square">
                      {isSequence ? (
                        <div 
                          style={{
                            backgroundImage: `url('${item.path}')`,
                            backgroundSize: item.orientation === 'h' ? 'auto 100%' : '100% auto',
                            backgroundPosition: (() => {
                              const frames = (item.frames as number) || 1;
                              const df = (item.defaultFrame as number) || 0;
                              const percent = frames > 1 ? (df / (frames - 1)) * 100 : 0;
                              return item.orientation === 'h' ? `${percent}% 0%` : `0% ${percent}%`;
                            })(),
                            backgroundRepeat: 'no-repeat',
                            width: '100%',
                            height: '100%'
                          }}
                          className="opacity-60 group-hover:opacity-100 transition-opacity"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element -- Library thumbnails can be arbitrary imported/static registry assets.
                        <img 
                          src={item.path as string} 
                          className="w-full h-full p-1 object-contain opacity-60 group-hover:opacity-100 transition-opacity"
                          alt={item.name as string}
                        />
                      )}
                      <div className="absolute top-1 right-1 px-1 bg-primary/20 border border-primary/40 rounded-[2px]">
                         <span className="text-[4px] font-black text-primary uppercase">LIB</span>
                      </div>
                  </div>
                  <span className="text-[5px] font-black uppercase tracking-tighter truncate w-full text-center mt-1">
                    {item.name}
                  </span>
                </button>
              );
            })
        ) : currentPath ? (
          folders.get(currentPath)?.map((asset: AssetSelectionMetadata) => (
            <button
              key={asset.id}
              onClick={() => onSelect(asset.id)}
              className={`
                  p-2 rounded-xs border flex flex-col gap-1 items-center transition-all group overflow-hidden min-h-[80px]
                  ${selectedAssetId === asset.id 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-outline text-foreground/40 hover:border-primary/50'}
              `}
            >
              <div className="w-full flex-1 bg-black/40 rounded-xs flex items-center justify-center overflow-hidden border border-white/5 relative aspect-square">
                  <Image 
                    src={resolveAsset(asset.id) || ''} 
                    fill
                    unoptimized
                    className="p-1 object-contain opacity-40 group-hover:opacity-100 transition-opacity"
                    alt={asset.id || 'Asset'}
                  />
              </div>
              <span className="text-[5px] font-black uppercase tracking-tighter truncate w-full text-center mt-1">
                {asset.id?.split('/').pop() || 'Untitled'}
              </span>
            </button>
          ))
        ) : (
          <div className="col-span-full h-full flex flex-col items-center justify-center py-10 opacity-20">
             <Plus className="w-10 h-10 mb-4" />
             <p className="text-[8px] font-black uppercase tracking-[0.3em]">Drop Assets Here</p>
          </div>
        )}
        </div>
      </div>

      {currentPath?.includes('lib:sequences') && (
        <div className="p-4 border wb-outline wb-surface-subtle rounded-xs space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 border-b wb-outline pb-2">
               <Film className="w-3 h-3 text-accent" />
               <span className="text-[9px] font-black uppercase text-accent tracking-widest">Sequence Metadata Inspector</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <label className="text-[5px] font-bold uppercase wb-text-muted tracking-widest ml-1">Asset Anatomy</label>
                  <div className="flex wb-surface-inset border wb-outline rounded-xs overflow-hidden h-6 items-center justify-center text-[6px] font-black uppercase tracking-widest text-foreground/20 italic">
                     Vertical Strip
                  </div>
               </div>
               <div className="space-y-1">
                  <label className="text-[5px] font-bold uppercase wb-text-muted tracking-widest ml-1">Zero Anchor (Frame)</label>
                  <div className="w-full wb-surface-inset border wb-outline rounded-xs px-2 py-1.5 text-[8px] font-mono wb-text-muted flex justify-between items-center italic">
                     <span>0</span>
                     <span className="text-[4px] font-black opacity-20">DEFAULT</span>
                  </div>
               </div>
               <div className="space-y-1">
                  <label className="text-[5px] font-bold uppercase wb-text-muted tracking-widest ml-1">Value Range / Scale</label>
                  <div className="w-full wb-surface-inset border wb-outline rounded-xs px-2 py-1.5 text-[8px] font-mono wb-text-muted flex justify-between items-center italic">
                     <span>0..1</span>
                     <span className="text-[4px] font-black opacity-20">NORMALIZED</span>
                  </div>
               </div>
            </div>
            <div className="mt-2 px-1">
               <p className="text-[5px] font-mono leading-relaxed text-foreground/30">
                 {`// SLAVE_MODE_V2: Logic mapping relative to parent component value.`}
                 {`// Mapping: frame = zeroAnchor + (value * range)`}
               </p>
            </div>
        </div>
      )}
      {pendingSequenceFiles && (
        <SequenceIngestionLab 
          files={pendingSequenceFiles}
          onCancel={() => setPendingSequenceFiles(null)}
          onComplete={(blob, metadata) => {
            setPendingSequenceFiles(null);
            // Create a File from the Blob for the industrial bridge
            const finalFile = new File([blob], `sequence_${Date.now()}.png`, { type: 'image/png' });
            const uploadBridge = (window as unknown as Record<string, UploadBridge>).triggerAssetUpload;
            if (uploadBridge) {
              uploadBridge([finalFile], (assetId: string) => onSelect(assetId, metadata));
            }
          }}
        />
      )}
      
      {/* Hidden upload bridge for library ingestion */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            setPendingSequenceFiles(Array.from(e.target.files));
          }
        }}
      />
    </div>
  );
}
