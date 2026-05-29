#!/usr/bin/env node
/**
 * OMEGA ARCHITECTURAL GUARD (Era 7.2.3) - Industrial Reporting Version
 * ---------------------------------------------------------------------------
 * This script enforces ADR-014: Architectural Precedence.
 * Pure JS implementation for maximum compatibility.
 * Lists detailed findings and generates a JSON report.
 * ---------------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';

const patterns = [
  'allowedFragments',
  'ElementCatalog',
  'elementCatalog',
  'throw new Error',
  'throw Error',
  'validate',
  'reject',
  'forbid',
  'deny'
];

const roots = ['src', 'docs', 'scripts'];
const findings = { HIGH: [], MEDIUM: [], LOW: [] };

console.log(`\n[OMEGA ARCH-GUARD] Auditing architectural precedence (ADR-014)...`);

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        scanDir(fullPath);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(file);
      if (['.ts', '.tsx', '.js', '.mjs', '.md'].includes(ext)) {
        scanFile(fullPath);
      }
    }
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/');
  const relativePath = path.relative(process.cwd(), filePath);
  
  patterns.forEach(pattern => {
    lines.forEach((line, index) => {
      if (line.includes(pattern)) {
        // Skip self and policy to avoid meta-hits
        if (normalizedPath.includes('arch-guard.mjs') || normalizedPath.includes('architectural_precedence_policy.md')) {
          return;
        }

        const finding = {
          file: relativePath,
          line: index + 1,
          content: line.trim(),
          pattern
        };

        // --- SEVERITY CLASSIFICATION ---
        
        // HIGH: Hard logic (Validators, Builders, Serializers, Services)
        const isHigh = (pattern === 'allowedFragments' || pattern === 'elementCatalog') && 
                       (normalizedPath.includes('validator') || 
                        normalizedPath.includes('builder') || 
                        normalizedPath.includes('serializer') ||
                        normalizedPath.includes('service'));

        // MEDIUM: UI & Rendering (Filtering, presentation hints)
        const isMedium = !isHigh && (normalizedPath.includes('src/components') || 
                                     normalizedPath.includes('src/features') ||
                                     normalizedPath.includes('renderers'));

        if (isHigh) {
          findings.HIGH.push(finding);
        } else if (isMedium) {
          findings.MEDIUM.push(finding);
        } else {
          findings.LOW.push(finding);
        }
      }
    });
  });
}

// EXECUTE SCAN
roots.forEach(root => scanDir(path.resolve(root)));

// PRINT DETAILED REPORT
['HIGH', 'MEDIUM', 'LOW'].forEach(severity => {
  if (findings[severity].length === 0) return;
  
  const icon = severity === 'HIGH' ? '❌' : (severity === 'MEDIUM' ? '⚠️' : '✅');
  console.log(`\n=== ${icon} ${severity} RISK HALLUCINATIONS (${findings[severity].length}) ===`);
  
  findings[severity].slice(0, 15).forEach(f => {
    console.log(`[${f.pattern}] ${f.file}:${f.line} -> ${f.content.substring(0, 80)}${f.content.length > 80 ? '...' : ''}`);
  });
  
  if (findings[severity].length > 15) {
    console.log(`... and ${findings[severity].length - 15} more in this category.`);
  }
});

// GENERATE JSON & CSV REPORTS
const reportDir = path.resolve('docs');
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir);

const summary = {
  timestamp: new Date().toISOString(),
  counts: {
    high: findings.HIGH.length,
    medium: findings.MEDIUM.length,
    low: findings.LOW.length,
    total: findings.HIGH.length + findings.MEDIUM.length + findings.LOW.length
  },
  details: findings
};

// Write JSON
fs.writeFileSync(path.join(reportDir, 'arch-audit-report.json'), JSON.stringify(summary, null, 2));

// Write CSV
const csvRows = ['Severity,File,Line,Pattern,Content'];
['HIGH', 'MEDIUM', 'LOW'].forEach(severity => {
  findings[severity].forEach(f => {
    // Sanitize content for CSV
    const cleanContent = f.content.replace(/"/g, '""').replace(/,/g, ';');
    csvRows.push(`${severity},"${f.file}",${f.line},"${f.pattern}","${cleanContent}"`);
  });
});
fs.writeFileSync(path.join(reportDir, 'arch-audit-report.csv'), csvRows.join('\n'));

console.log(`\n[SUMMARY] Audit complete.`);
console.log(`- High-risk:   ${findings.HIGH.length}`);
console.log(`- Medium-risk: ${findings.MEDIUM.length}`);
console.log(`- Low-risk:    ${findings.LOW.length}`);
console.log(`- JSON Report: docs/arch-audit-report.json`);
console.log(`- CSV Report:  docs/arch-audit-report.csv`);

if (findings.HIGH.length > 0) {
  console.log(`\n❌ ARCHITECTURAL BREACH: ADR-014 Violation.`);
  console.log(`PROGRESS:Structural Audit:COMPLETE:${findings.HIGH.length}:${findings.MEDIUM.length + findings.LOW.length}`);
  process.exit(2);
} else {
  console.log(`\n✅ ARCHITECTURAL INTEGRITY VERIFIED.`);
  console.log(`PROGRESS:Structural Audit:COMPLETE:0:${findings.MEDIUM.length + findings.LOW.length}`);
  process.exit(0);
}
