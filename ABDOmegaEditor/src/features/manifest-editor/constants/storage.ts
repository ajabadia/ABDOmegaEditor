/**
 * @purpose Gestiona claves de almacenamiento para persistencia de localStorage en el editor de manifesto OMEGA, asegurando versiones y evitando corrupción de esquema.
 * @purpose_en Manages storage keys for localStorage persistence in the OMEGA manifest editor, ensuring versioning and preventing schema corruption.
 * @refactorable false
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:2,imports:0,sig:10jz0cb
 * @lastUpdated 2026-06-15T13:09:59.030Z
 */

/**
 * OMEGA STORAGE CONSTANTS - ERA 7.2.3
 * Centralized keys for localStorage persistence to ensure versioning and prevent schema corruption.
 */

export const STORAGE_VERSION = 'v1';

export const STORAGE_KEYS = {
  // Document Orchestrator: Multi-document sessions
  SESSION_DOCS: `omega_${STORAGE_VERSION}_session_docs`,
  
  // Workbench: Layout, tabs, and UI state
  WORKBENCH_SESSION: `omega_${STORAGE_VERSION}_workbench_session`,
  
  // Library: User-saved Universal Cells and templates
  CELL_LIBRARY: `omega_${STORAGE_VERSION}_cell_library`,
  
  // Services: Cross-document clipboard
  CLIPBOARD: `omega_${STORAGE_VERSION}_clipboard`,

  // Audit Engine: Persistent audit trail (Phase 9.5+)
  AUDIT_LOGS: `omega_${STORAGE_VERSION}_audit_logs`,
};
