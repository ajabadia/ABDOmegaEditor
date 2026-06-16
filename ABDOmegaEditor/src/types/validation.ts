/**
 * @purpose Gestiona la estructura para problemas de validación en archivos manifest de OMEGA.
 * @purpose_en Defines the structure for validation issues in OMEGA manifest files.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:qtz8f6
 * @lastUpdated 2026-06-15T17:03:56.234Z
 */

/**
 * OMEGA Validation Types (Era 7.2.3)
 */

export interface ValidationIssue {
  path: string;
  message: string;
  keyword: string;
  severity: 'critical' | 'error' | 'warning' | 'audit' | 'info'; 
}
