'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { OMEGA_Manifest, OMEGA_Contract } from '@/omega-ui-core/types/manifest';
import type { OmegaContract } from '@/services/wasmLoader';
import { ValidationService } from '@/services/validationService';
import { STORAGE_KEYS } from '../constants/storage';
import { structuralAuditor } from '../services/StructuralAuditor';
import type { ValidationIssue } from '@/types/validation';

/**
 * useAuditEngine (Phase 9.5+ - Final)
 * Returns ValidationIssue[] for compatibility with useDeployment contract.
 */
export const useAuditEngine = (manifest: OMEGA_Manifest, contract: (OmegaContract | OMEGA_Contract) | null) => {
  // Lazy initializer avoids setState in useEffect (no cascading renders)
  const [logs, setLogs] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (!stored) return [];
    try {
      return JSON.parse(stored) as string[];
    } catch {
      return [];
    }
  });

  const isInitialized = useRef(false);

  // Persistence - Save logs
  useEffect(() => {
    if (logs.length > 0) {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(-100)));
    }
  }, [logs]);

  // Logger API
  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logEntry = `[${timestamp}] ${msg}`;
    setLogs(prev => [...prev, logEntry].slice(-100));
  }, []);

  // Initial Certification Log
  useEffect(() => {
    if (!isInitialized.current && manifest) {
      addLog(`SYSTEM_READY: Initializing audit for document ${manifest.id || 'anonymous'}`);
      isInitialized.current = true;
    }
  }, [manifest, addLog]);

  // Diagnostic Aggregation — returns ValidationIssue[] for useDeployment compatibility
  const issues = useMemo((): ValidationIssue[] => {
    if (!manifest) return [];

    // A. Schema + Industrial Rules
    const baseIssues = ValidationService.validate(manifest, contract as Parameters<typeof ValidationService.validate>[1]) || [];

    // B. Semantic structural audit — mapped to ValidationIssue shape
    const structuralResults = structuralAuditor.extractDiagnostics(manifest, { contract });
    const structuralIssues: ValidationIssue[] = [
      ...structuralResults.errors,
      ...structuralResults.warnings,
    ].map(d => ({
      path: d.entityId || d.id,
      message: d.message,
      keyword: d.code || d.source,
      severity: d.severity === 'error' ? 'error' : 'warning',
    }));

    return [...baseIssues, ...structuralIssues];
  }, [manifest, contract]);

  return { issues, logs, addLog, clearLogs: () => setLogs([]) };
};
