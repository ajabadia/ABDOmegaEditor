/**
 * OMEGA Contract Service (v7.2.3)
 * Handles generation of technical contracts (enums, schema IDs) from manifests.
 */
import type { OMEGA_Manifest } from '../types/manifest';

export class ContractService {
  /**
   * Generates a TypeScript source file containing Enums for all parameters and ports.
   * This is the "Numeric Authority" for the C++ engine.
   */
  static generateTypeScriptContract(manifest: OMEGA_Manifest): string {
    const controls = manifest.ui?.controls || [];
    const jacks = manifest.ui?.jacks || [];
    const name = manifest.metadata?.name || 'OmegaModule';
    const safeName = name.replace(/[^a-zA-Z0-9]/g, '');

    let content = `/**\n * OMEGA Technical Contract: ${name}\n * Generated: ${new Date().toISOString()}\n * DO NOT EDIT MANUALLY — Exported from OMEGA Manifest Editor\n */\n\n`;

    // ParamId Enum
    content += `export enum ${safeName}ParamId {\n`;
    controls.forEach((c, idx) => {
      const id = c.id.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      content += `  ${id} = ${idx}, // ${c.label || c.id}\n`;
    });
    content += `}\n\n`;

    // PortId Enum
    content += `export enum ${safeName}PortId {\n`;
    jacks.forEach((j, idx) => {
      const id = j.id.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      content += `  ${id} = ${idx}, // ${j.label || j.id}\n`;
    });
    content += `}\n\n`;

    // Metadata Export
    content += `export const ${safeName}Metadata = {\n`;
    content += `  HP: ${manifest.metadata?.rack?.hp || 12},\n`;
    content += `  VERSION: "${manifest.metadata?.version || '1.0.0'}",\n`;
    content += `  CANONICAL_ID: "${manifest.id}"\n`;
    content += `};\n`;

    return content;
  }

  /**
   * Generates a C++ Header file for direct inclusion in the OMEGA Engine.
   */
  static generateCppContract(manifest: OMEGA_Manifest): string {
    const controls = manifest.ui?.controls || [];
    const jacks = manifest.ui?.jacks || [];
    const name = manifest.metadata?.name || 'OmegaModule';
    const safeName = name.toUpperCase().replace(/[^A-Z0-9]/g, '_');

    let content = `/**\n * OMEGA Technical Contract: ${name}\n * Generated: ${new Date().toISOString()}\n */\n\n`;
    content += `#pragma once\n\n`;
    content += `namespace ${safeName}_CONTRACT {\n\n`;

    content += `  enum ParamId {\n`;
    controls.forEach((c, idx) => {
      const id = c.id.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      content += `    ${id} = ${idx}, // ${c.label || c.id}\n`;
    });
    content += `  };\n\n`;

    content += `  enum PortId {\n`;
    jacks.forEach((j, idx) => {
      const id = j.id.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      content += `    ${id} = ${idx}, // ${j.label || j.id}\n`;
    });
    content += `  };\n\n`;

    content += `  static constexpr int HP = ${manifest.metadata?.rack?.hp || 12};\n`;
    content += `  static const char* VERSION = "${manifest.metadata?.version || '1.0.0'}";\n`;

    content += `}\n`;

    return content;
  }
 
  /**
   * Triggers a browser download for the generated contract.
   * Keeps components aseptic by handling DOM effects here.
   */
  static downloadContract(manifest: OMEGA_Manifest, format: 'ts' | 'cpp') {
    const content = format === 'ts' 
      ? this.generateTypeScriptContract(manifest)
      : this.generateCppContract(manifest);
    
    const filename = format === 'ts' ? 'schema_ids.ts' : 'OmegaRegistry.h';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
