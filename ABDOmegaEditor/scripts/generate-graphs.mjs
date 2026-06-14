#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const APP_DIR = path.join(PROJECT_ROOT, 'app');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'docs', 'grafos');

// Files that are expected to have no imports/dependents (framework entry points, ambient types, etc.)
// These are excluded from the orphan list to reduce noise.
const ORPHAN_EXCLUSIONS = [
  'app/',                    // Next.js entry points (page.tsx, robots.ts, api/*, etc.)
  'src/types/global.d.ts',   // Ambient global type declarations — discovered by TypeScript, not imported
];

// Ensure output directory exists
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Read tsconfig.json to handle path aliases
let pathsConfig = {};
try {
  const tsconfig = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'tsconfig.json'), 'utf8'));
  pathsConfig = tsconfig.compilerOptions?.paths || {};
} catch (e) {
  console.warn('Could not load tsconfig.json paths:', e.message);
}

// Extracted files and their dependencies
const dependencies = new Map(); // file -> Set of resolved dependencies
const dependents = new Map(); // file -> Set of resolved dependents

// Walk directory recursively
function walk(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git' && file !== 'dist' && file !== 'docs') {
        walk(filePath, fileList);
      }
    } else {
      const ext = path.extname(file);
      if (['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(ext) && !file.endsWith('.test.ts') && !file.endsWith('.test.tsx') && !file.endsWith('.spec.ts') && !file.endsWith('.spec.tsx')) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

// Get all files
const allFiles = [...walk(SRC_DIR), ...walk(APP_DIR)];
const relativeFiles = allFiles.map(f => path.relative(PROJECT_ROOT, f).replace(/\\/g, '/'));

// Initialize maps
for (const file of relativeFiles) {
  dependencies.set(file, new Set());
  dependents.set(file, new Set());
}

// Resolve import path to a relative file path in the project
function resolveImport(importPath, currentFileDir) {
  // 1. Resolve path aliases (e.g. @/components/ui/button)

  for (const alias of Object.keys(pathsConfig)) {
    const aliasPrefix = alias.replace('*', '');
    if (importPath.startsWith(aliasPrefix)) {
      const targetPrefixes = pathsConfig[alias].map(p => p.replace('*', ''));
      for (const targetPrefix of targetPrefixes) {
        // Try resolving by replacing aliasPrefix with targetPrefix
        const candidate = path.join(PROJECT_ROOT, importPath.replace(aliasPrefix, targetPrefix));
        const resolvedPath = checkFileExistence(candidate);
        if (resolvedPath) {
          return path.relative(PROJECT_ROOT, resolvedPath).replace(/\\/g, '/');
        }
      }
    }
  }

  // 2. Resolve relative imports (e.g. ./utils, ../types)
  if (importPath.startsWith('.')) {
    const candidate = path.resolve(currentFileDir, importPath);
    const resolved = checkFileExistence(candidate);
    if (resolved) {
      return path.relative(PROJECT_ROOT, resolved).replace(/\\/g, '/');
    }
  }

  return null;
}

function checkFileExistence(basePath) {
  const extensions = ['.tsx', '.ts', '.jsx', '.js', '.d.ts', '.mjs'];
  
  // Direct file check
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
    return basePath;
  }
  // Try extensions
  for (const ext of extensions) {
    if (fs.existsSync(basePath + ext)) {
      return basePath + ext;
    }
  }
  // Try index files
  for (const ext of extensions) {
    const indexFile = path.join(basePath, 'index' + ext);
    if (fs.existsSync(indexFile)) {
      return indexFile;
    }
  }
  return null;
}

// Parse imports from file content
const importRegex = /(?:import|export)\s+?(?:type\s+?)?(?:[^'"]+|{[\s\S]*?})\s+?from\s+?['"]([^'"]+)['"]/g;
const simpleImportRegex = /import\s+?['"]([^'"]+)['"]/g;
const dynamicImportRegex = /import\((?:['"]([^'"]+)['"])\)/g;

function extractImports(content) {
  const imports = new Set();
  let match;
  
  // Reset regex indices
  importRegex.lastIndex = 0;
  simpleImportRegex.lastIndex = 0;
  dynamicImportRegex.lastIndex = 0;

  while ((match = importRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }
  while ((match = simpleImportRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }
  while ((match = dynamicImportRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }
  return Array.from(imports);
}

// Analyze all files
console.log(`Scanning ${allFiles.length} files for dependencies...`);
for (let i = 0; i < allFiles.length; i++) {
  const filePath = allFiles[i];
  const relativePath = relativeFiles[i];
  const fileDir = path.dirname(filePath);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const importedPaths = extractImports(content);
    
    for (const imp of importedPaths) {
      const resolved = resolveImport(imp, fileDir);
      if (resolved && resolved !== relativePath) {
        dependencies.get(relativePath).add(resolved);
        if (!dependents.has(resolved)) {
          dependents.set(resolved, new Set());
        }
        dependents.get(resolved).add(relativePath);
      }
    }
  } catch (e) {
    console.error(`Error reading ${relativePath}:`, e.message);
  }
}

// Generate Markdown files mirroring the project structure
console.log('Generating Obsidian Markdown graph files...');
for (const file of relativeFiles) {
  const outputFilePath = path.join(OUTPUT_DIR, file + '.md');
  const outputFileDir = path.dirname(outputFilePath);
  
  if (!fs.existsSync(outputFileDir)) {
    fs.mkdirSync(outputFileDir, { recursive: true });
  }
  
  const fileDeps = Array.from(dependencies.get(file) || []).sort();
  const fileDepsOf = Array.from(dependents.get(file) || []).sort();
  
  let mdContent = `# ${file}\n\n`;
  mdContent += `> [!NOTE]\n`;
  mdContent += `> Ruta del archivo: \`${file}\`\n\n`;
  
  mdContent += `## 🔌 Dependencias (Imports / Usos)\n`;
  if (fileDeps.length === 0) {
    mdContent += `*Este archivo no tiene dependencias de otros archivos del proyecto.*\n`;
  } else {
    for (const dep of fileDeps) {
      const displayName = path.basename(dep);
      mdContent += `- [[docs/grafos/${dep}|${displayName}]] (\`${dep}\`)\n`;
    }
  }
  
  mdContent += `\n## 🧲 Dependientes (Importado por / Usado por)\n`;
  if (fileDepsOf.length === 0) {
    mdContent += `*Ningún otro archivo del proyecto importa este archivo directamente.*\n`;
  } else {
    for (const depOf of fileDepsOf) {
      const displayName = path.basename(depOf);
      mdContent += `- [[docs/grafos/${depOf}|${displayName}]] (\`${depOf}\`)\n`;
    }
  }
  
  fs.writeFileSync(outputFilePath, mdContent, 'utf8');
}

// Generate master GRAPH.md
const orphans = [];
const orphansExcluded = [];
let totalConnections = 0;
for (const file of relativeFiles) {
  const depsCount = dependencies.get(file)?.size || 0;
  const depsOfCount = dependents.get(file)?.size || 0;
  totalConnections += depsCount;
  if (depsCount === 0 && depsOfCount === 0) {
    const isExcluded = ORPHAN_EXCLUSIONS.some(pattern => file.startsWith(pattern));
    if (isExcluded) {
      orphansExcluded.push(file);
    } else {
      orphans.push(file);
    }
  }
}

// Build module level graph (e.g. src/components, src/lib, app)
const moduleConnections = new Map(); // "moduleA -> moduleB" -> count
function getModuleName(filePath) {
  const parts = filePath.split('/');
  if (parts[0] === 'src') {
    return parts.length > 2 ? `src/${parts[1]}/${parts[2]}` : `src/${parts[1]}`;
  }
  return parts[0]; // e.g. "app"
}

for (const [file, deps] of dependencies.entries()) {
  const sourceMod = getModuleName(file);
  for (const dep of deps) {
    const destMod = getModuleName(dep);
    if (sourceMod !== destMod) {
      const key = `"${sourceMod}" --> "${destMod}"`;
      moduleConnections.set(key, (moduleConnections.get(key) || 0) + 1);
    }
  }
}

let mermaidGraph = `graph TD\n`;
for (const conn of moduleConnections.keys()) {
  mermaidGraph += `  ${conn}:::edgeText\n`;
}
// Add some styles to mermaid
mermaidGraph += `  classDef default fill:#111,stroke:#00f0ff,stroke-width:1px,color:#fff;\n`;

let masterMd = `# Índice Maestro de Grafos de Dependencia

Esta carpeta contiene la estructura completa e interactiva de dependencias del proyecto **ABDOmegaEditor**.

---

## 🔄 Cómo Actualizar el Grafo
Cuando realices cambios en la estructura de archivos o agregues nuevos imports, actualiza este grafo ejecutando:
\`\`\`bash
npm run generate-graphs
\`\`\`

---

## 🧭 Instrucciones para Obsidian
1. Abre esta carpeta del proyecto (\`ABDOmegaEditor\`) en **Obsidian** como un Vault.
2. Abre la vista de grafos (Graph View), o utiliza grafos locales en cualquier archivo dentro de \`docs/grafos/\`.
3. ¡Haz clic en los enlaces dentro de cada markdown para navegar por el mapa visual del código!

---

## 📊 Estadísticas del Proyecto
- **Total de Archivos Escaneados:** ${relativeFiles.length}
- **Total de Conexiones (Imports):** ${totalConnections}
- **Promedio de Dependencias por Archivo:** ${(totalConnections / relativeFiles.length).toFixed(2)}

---

## 🕸️ Relaciones de Módulos (Alto Nivel)
El siguiente diagrama muestra las conexiones entre los directorios principales (el grosor o presencia representa importaciones de archivos):

\`\`\`mermaid
${mermaidGraph}
\`\`\`

---

## 🔍 Análisis de Archivos Huérfanos o Aislados
Los archivos huérfanos **no tienen dependencias entrantes ni salientes** dentro del proyecto. Pueden ser componentes antiguos, scripts independientes, puntos de entrada no referenciados o código muerto:

${orphans.length === 0 ? '_No se detectaron archivos aislados._' : orphans.map(f => `- [\`${f}\`](file:///${path.join(PROJECT_ROOT, f).replace(/\\/g, '/')})`).join('\n')}

> [!NOTE] Archivos excluidos del análisis
> Los siguientes archivos son entry points del framework o declaraciones globales que **por diseño** no son importados por otros archivos:
> \
${orphansExcluded.map(f => `> - \`${f}\``).join('\n')}
`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'GRAPH.md'), masterMd, 'utf8');
console.log('GRAPH.md and graph folder generated successfully in docs/grafos!');
