/**
 * OMEGA Validation Types (Era 7.2.3)
 */

export interface ValidationIssue {
  path: string;
  message: string;
  keyword: string;
  severity: 'critical' | 'error' | 'warning' | 'audit'; 
}
