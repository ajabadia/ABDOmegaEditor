/**
 * @purpose Gestiona la estructura para problemas de validación en configuraciones del editor de manifesto OMEGA.
 * @purpose_en Defines the structure for validation issues in OMEGA manifest editor configurations.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:1wwfdtb
 * @lastUpdated 2026-06-15T16:10:38.911Z
 */

/**
 * OMEGA Validation Types (Era 7.2.3)
 */

export interface ValidationIssue {
  path: string;
  message: string;
  keyword: string;
  severity: 'critical' | 'error' | 'warning' | 'audit'; 
}
