#!/usr/bin/env node
/**
 * OMEGA CODEBASE DOCUMENTER - ORCHESTRATOR
 * Automated script to document Javascript/Typescript files using a local LLM API (Ollama/LM Studio).
 * Compares timestamps to prevent redundant audits and respects codebase safety.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

// Configuration (can be overridden with environment variables)
const API_ENDPOINT = process.env.LLM_ENDPOINT || 'http://localhost:11434/v1/chat/completions'; // Default Ollama OpenAI-compatible port
const PROJECT_ROOT = process.cwd();
const PLAN_PATH = path.join(PROJECT_ROOT, 'LLM_DOCUMENTATION_PLAN.md');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const APP_DIR = path.join(PROJECT_ROOT, 'app');

// Pipeline configuration
const USE_PIPELINE = (process.env.USE_PIPELINE || 'true').toLowerCase() === 'true';
const MODEL_CODER = process.env.LLM_MODEL_CODER || 'qwen2.5-coder:7b';
const MODEL_TRANSLATOR = process.env.LLM_MODEL_TRANSLATOR || 'llama3.1:8b-instruct-q4_0';
const SINGLE_MODEL = process.env.LLM_MODEL || 'llama3.1:8b-instruct-q4_0'; // Fallback single model
const TEMP_FILE_PATH = path.join(PROJECT_ROOT, '.temp_batch_descriptions.json');

// Max files to process in a single run (to allow monitoring progress)
const BATCH_LIMIT = parseInt(process.env.BATCH_LIMIT || '10', 10);

console.log('=== OMEGA CODEBASE DOCUMENTER ===');
console.log(`Endpoint: ${API_ENDPOINT}`);
if (USE_PIPELINE) {
  console.log(`Mode: Two-step Pipeline (Enabled)`);
  console.log(`Coder Model: ${MODEL_CODER}`);
  console.log(`Translator Model: ${MODEL_TRANSLATOR}`);
  console.log(`Temp File: ${TEMP_FILE_PATH}`);
} else {
  console.log(`Mode: Single-step Model (Direct)`);
  console.log(`Model: ${SINGLE_MODEL}`);
}
console.log(`Batch Limit: ${BATCH_LIMIT} files\n`);

// Helper to walk directories recursively
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
      if (['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(ext) && 
          !file.endsWith('.test.ts') && !file.endsWith('.test.tsx') && 
          !file.endsWith('.spec.ts') && !file.endsWith('.spec.tsx')) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

// Get all files to process
const allFiles = [...walk(SRC_DIR), ...walk(APP_DIR)];
const relativeFiles = allFiles.map(f => path.relative(PROJECT_ROOT, f).replace(/\\/g, '/'));

// Read already processed files from the plan log
let completedFiles = new Set();
if (fs.existsSync(PLAN_PATH)) {
  const planContent = fs.readFileSync(PLAN_PATH, 'utf8');
  // Match lines like: - [x] `path/to/file.ts`
  const regex = /-\s*\[x\]\s*`([^`]+)`/g;
  let match;
  while ((match = regex.exec(planContent)) !== null) {
    completedFiles.add(match[1]);
  }
} else {
  console.error(`Error: Plan file not found at ${PLAN_PATH}. Please create it first.`);
  process.exit(1);
}

// Filter out completed files
const pendingFiles = relativeFiles.filter(f => !completedFiles.has(f));

if (pendingFiles.length === 0) {
  console.log('All files are already documented! No work pending.');
  process.exit(0);
}

console.log(`Found ${relativeFiles.length} total files. ${completedFiles.size} completed, ${pendingFiles.length} pending.`);
const batch = pendingFiles.slice(0, BATCH_LIMIT);
console.log(`Processing batch of ${batch.length} files...\n`);

// Generic function to query Ollama API
async function callLLM(model, prompt, temperature = 0.1, maxTokens = 150) {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: temperature,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status} using model ${model}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// Query technical description in English from Coder Model
async function queryEnglishDescription(filePath, content) {
  const dirName = path.dirname(filePath);
  const baseName = path.basename(filePath);
  const contextHint = dirName.startsWith('src/services') ? 'servicios de infraestructura o lógica de negocio'
    : dirName.startsWith('src/features') ? 'componentes y lógica de la funcionalidad de edición'
    : dirName.startsWith('src/components') ? 'componentes de interfaz de usuario (UI)'
    : dirName.startsWith('src/omega-ui-core') ? 'núcleo del sistema de diseño y renderizadores visuales'
    : dirName.startsWith('app') ? 'rutas y páginas de Next.js'
    : 'código del editor';

  // Smart truncation: first 5000 chars (imports, declarations) + last 2500 chars (exports, closures)
  let fileContentSlice = content;
  if (content.length > 7500) {
    fileContentSlice = content.slice(0, 5000) + '\n\n[... TRUNCATED MIDDLE CONTENT ...]\n\n' + content.slice(-2500);
  }

  const prompt = `Analyze the following source code file and identify its main purpose in the context of the OMEGA manifest editor (ABDOmegaEditor).
File path: ${filePath}
Name: ${baseName}
Directory/Context: ${dirName} (${contextHint})

File content:
\`\`\`
${fileContentSlice}
\`\`\`

⚠️ STRICT INSTRUCTIONS — FOLLOW TO THE LETTER:
- Return ONLY a precise 1-sentence description in English of what the file does.
- START DIRECTLY with an action verb (e.g., "Manages...", "Renders...", "Handles...", "Validates...", "Calculates...").
- ⛔ NEVER start with "This file...", "The file...", "This code...", "The hook...", "The service..." or any other self-referential phrase.
- ⛔ DO NOT add any extra explanations, markdown, formatting, JSDoc blocks, or apologies.
- ⛔ DO NOT use more than 1 sentence. Be surgical.
- Only return the plain text of the description, without quotes or ending punctuation.`;

  try {
    const rawEnglish = await callLLM(MODEL_CODER, prompt);
    let englishDescription = rawEnglish.replace(/^["']|["']$/g, '');
    // Clean up English self-reference
    englishDescription = englishDescription.replace(/^(This\s+(file|code)|The\s+(file|code|hook|component|service|function))\s+/i, '');
    englishDescription = englishDescription.replace(/^[\s:,;.-]+/, '').trim();
    englishDescription = englishDescription.charAt(0).toUpperCase() + englishDescription.slice(1);
    return englishDescription;
  } catch (error) {
    console.error(`[Error in Pass 1 for ${filePath}] ${error.message}`);
    return null;
  }
}

// Translate English technical description to Spanish using Translator Model
async function translateToSpanish(englishDescription) {
  const prompt = `Traduce la siguiente descripción técnica en inglés al español de forma natural y fluida.
Descripción técnica:
"${englishDescription}"

⚠️ INSTRUCCIONES ESTRICTAS — SIGUE AL PIE DE LA LETRA:
- Devuelve ÚNICAMENTE la traducción precisa en español.
- EMPIEZA DIRECTAMENTE con el verbo de acción en español (por ejemplo: "Gestiona...", "Renderiza...", "Proporciona...", "Valida...").
- ⛔ NUNCA empieces con "Este archivo...", "El archivo...", "Esta descripción...", "El texto traducido..." ni ninguna otra frase similar.
- ⛔ NO agregues explicaciones adicionales, markdown, ni te disculpes.
- ⛔ NO uses más de 1 frase. Sé quirúrgico.
- Solo devuelve el texto plano de la traducción en español, sin comillas ni puntuación al final.`;

  try {
    const rawSpanish = await callLLM(MODEL_TRANSLATOR, prompt);
    let description = rawSpanish.replace(/^["']|["']$/g, '');
    
    // Clean up Spanish self-reference
    description = description.replace(/^(Este\s+(archivo|código)|El\s+(archivo|siguiente|código)|La\s+función|El\s+hook|El\s+componente|El\s+servicio|Esta\s+descripción)\s+/i, '');
    description = description.replace(/^[\s:,;.-]+/, '').trim();
    description = description.charAt(0).toUpperCase() + description.slice(1);
    return description;
  } catch (error) {
    console.error(`[Error in Pass 2 (Translation)] ${error.message}`);
    return null;
  }
}

// Query direct description in Spanish (Single Model Fallback)
async function queryDirectSpanish(filePath, content) {
  const dirName = path.dirname(filePath);
  const baseName = path.basename(filePath);
  const contextHint = dirName.startsWith('src/services') ? 'servicios de infraestructura o lógica de negocio'
    : dirName.startsWith('src/features') ? 'componentes y lógica de la funcionalidad de edición'
    : dirName.startsWith('src/components') ? 'componentes de interfaz de usuario (UI)'
    : dirName.startsWith('src/omega-ui-core') ? 'núcleo del sistema de diseño y renderizadores visuales'
    : dirName.startsWith('app') ? 'rutas y páginas de Next.js'
    : 'código del editor';

  let fileContentSlice = content;
  if (content.length > 7500) {
    fileContentSlice = content.slice(0, 5000) + '\n\n[... TRUNCATED MIDDLE CONTENT ...]\n\n' + content.slice(-2500);
  }

  const prompt = `Analiza el siguiente archivo de código fuente e identifica su propósito principal en el contexto del editor de manifiestos OMEGA (ABDOmegaEditor).
Ruta del archivo: ${filePath}
Nombre: ${baseName}
Directorio/Contexto: ${dirName} (${contextHint})

Contenido del archivo:
\`\`\`
${fileContentSlice}
\`\`\`

⚠️ INSTRUCCIONES ESTRICTAS — SIGUE AL PIE DE LA LETRA:
- Devuelve ÚNICAMENTE una descripción precisa de 1 frase en español sobre lo que hace el archivo.
- EMPIEZA DIRECTAMENTE con el verbo de acción. Ejemplo correcto: "Gestiona la carga de WebAssembly, extrae el contrato del módulo y lo expone a la UI".
- ⛔ NUNCA empieces con "Este archivo...", "El archivo...", "El siguiente código..." ni ninguna otra frase que se refiera al archivo mismo.
- ⛔ NO agregues explicaciones adicionales, markdown, bloques JSDoc, ni te disculpes.
- ⛔ NO uses más de 1 frase. Sé quirúrgico.
- Solo devuelve el texto plano de la descripción, sin comillas ni puntuación al final.`;

  try {
    const rawSpanish = await callLLM(SINGLE_MODEL, prompt);
    let description = rawSpanish.replace(/^["']|["']$/g, '');
    
    // Post-procesamiento
    description = description.replace(/^(Este\s+(archivo|código)|El\s+(archivo|siguiente|código)|La\s+función|El\s+hook|El\s+componente|El\s+servicio)\s+/i, '');
    description = description.replace(/^[\s:,;.-]+/, '').trim();
    description = description.charAt(0).toUpperCase() + description.slice(1);
    
    return description;
  } catch (error) {
    console.error(`[Error de API con LLM] ${error.message}`);
    return null;
  }
}

// Inject JSDoc into the file
function injectJSDoc(filePath, purpose) {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  let content = fs.readFileSync(fullPath, 'utf8');

  // Detect line ending (\r\n or \n)
  const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';

  // Regex to detect if @purpose JSDoc already exists to overwrite it
  const existingJSDocRegex = /\/\*\*[\s\S]*?@purpose[\s\S]*?\*\/\r?\n?/;
  const hasJSDoc = existingJSDocRegex.test(content);

  const timestamp = new Date().toISOString();
  const newJSDoc = `/**
 * @purpose ${purpose}
 * @lastUpdated ${timestamp}
 */${lineEnding}`;

  if (hasJSDoc) {
    // Overwrite existing JSDoc
    content = content.replace(existingJSDocRegex, newJSDoc);
  } else {
    // Inject at the beginning
    const useClientRegex = /^('use client'|"use client");?\r?\n/;
    const match = content.match(useClientRegex);
    if (match) {
      const useClientLine = match[0]; // Includes trailing line ending
      const rest = content.slice(useClientLine.length);
      // Remove leading empty spaces/lines from rest to normalize spacing
      content = `${useClientLine.trimEnd()}${lineEnding}${lineEnding}${newJSDoc}${lineEnding}${rest.trimStart()}`;
    } else {
      content = `${newJSDoc}${lineEnding}${content.trimStart()}`;
    }
  }

  fs.writeFileSync(fullPath, content, 'utf8');
}

// Append to LLM_DOCUMENTATION_PLAN.md progress list
function logProgressInPlan(filePath) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const logLine = `\n- [x] \`${filePath}\` | Completado: ${timestamp}`;
  fs.appendFileSync(PLAN_PATH, logLine, 'utf8');
}

// Process loop
let successCount = 0;

if (USE_PIPELINE) {
  // === TWO-PASS PIPELINE ARCHITECTURE ===
  const englishDescriptions = {};
  
  // Pass 1: English Analysis with Coder Model
  console.log(`\n--- PASS 1: Technical Analysis (Model: ${MODEL_CODER}) ---`);
  for (const file of batch) {
    console.log(`Analyzing (EN): ${file}...`);
    try {
      const fullPath = path.join(PROJECT_ROOT, file);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Get technical English description
      const purposeEN = await queryEnglishDescription(file, content);
      if (purposeEN) {
        englishDescriptions[file] = purposeEN;
        console.log(`   -> English summary: "${purposeEN}"`);
      } else {
        console.log(`   -> ⚠️ Failed to generate English description. Skipping.\n`);
      }
    } catch (err) {
      console.error(`   -> ❌ Error during analysis for ${file}: ${err.message}\n`);
    }
  }

  // Save English descriptions to temporary JSON file (as requested)
  if (Object.keys(englishDescriptions).length > 0) {
    fs.writeFileSync(TEMP_FILE_PATH, JSON.stringify(englishDescriptions, null, 2), 'utf8');
    console.log(`\nSaved ${Object.keys(englishDescriptions).length} English descriptions to temporary file: ${TEMP_FILE_PATH}`);
    
    // Read English descriptions back from temporary file
    const loadedEnglishDescriptions = JSON.parse(fs.readFileSync(TEMP_FILE_PATH, 'utf8'));

    // Pass 2: Spanish Translation with Translator Model
    console.log(`\n--- PASS 2: Spanish Translation & JSDoc Injection (Model: ${MODEL_TRANSLATOR}) ---`);
    for (const file of Object.keys(loadedEnglishDescriptions)) {
      console.log(`Translating (ES): ${file}...`);
      try {
        const englishDescription = loadedEnglishDescriptions[file];
        const purposeES = await translateToSpanish(englishDescription);
        if (purposeES) {
          console.log(`   -> Spanish translation: "${purposeES}"`);
          injectJSDoc(file, purposeES);
          logProgressInPlan(file);
          console.log(`   -> Successfully injected and logged.\n`);
          successCount++;
        } else {
          console.log(`   -> ⚠️ Failed to translate to Spanish. Skipping.\n`);
        }
      } catch (err) {
        console.error(`   -> ❌ Error during translation/injection for ${file}: ${err.message}\n`);
      }
    }
    
    // Clean up temporary JSON file
    if (fs.existsSync(TEMP_FILE_PATH)) {
      fs.unlinkSync(TEMP_FILE_PATH);
    }
  }
} else {
  // === SINGLE-PASS DIRECT ARCHITECTURE ===
  console.log(`\n--- SINGLE-PASS DIRECT DOCUMENTATION (Model: ${SINGLE_MODEL}) ---`);
  for (const file of batch) {
    console.log(`Analyzing (ES): ${file}...`);
    try {
      const fullPath = path.join(PROJECT_ROOT, file);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const purpose = await queryDirectSpanish(file, content);
      if (purpose) {
        console.log(`   -> Propósito identificado: "${purpose}"`);
        injectJSDoc(file, purpose);
        logProgressInPlan(file);
        console.log(`   -> Guardado e inyectado con éxito.\n`);
        successCount++;
      } else {
        console.log(`   -> ⚠️ Falló la obtención de descripción del LLM. Saltando.\n`);
      }
    } catch (err) {
      console.error(`   -> ❌ Error procesando el archivo ${file}: ${err.message}\n`);
    }
  }
}

// Run graph regenerator if we processed any file successfully
if (successCount > 0) {
  console.log('Regenerating Obsidian graph files...');
  try {
    execSync('npm run generate-graphs', { stdio: 'inherit' });
    console.log('[SUCCESS] Graphs updated successfully.');
  } catch (err) {
    console.error('[Error] Failed to run generate-graphs script:', err.message);
  }
}

console.log(`\nBatch completed: ${successCount} of ${batch.length} files successfully processed.`);
