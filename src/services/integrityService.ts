/**
 * OMEGA Integrity Service (v7.2.3)
 * Provides cryptographic hashing for manifest firmware integrity checks.
 */
import type { OMEGA_Manifest } from '../types/manifest';

export class IntegrityService {
  /**
   * Generates a SHA-256 hash of any object.
   * Uses canonical normalization (alphabetical key sorting and minification).
   */
  static async generateHash(obj: Record<string, unknown>): Promise<string> {
    // 1. Remove hash/firmwareHash/id property if present to calculate clean structural hash
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hash, firmwareHash, id, ...cleanObj } = obj;
    
    // Canonical Normalization: Recursive Key Sorting
    const sortObject = (o: unknown): unknown => {
      if (o === null || typeof o !== 'object') return o;
      if (Array.isArray(o)) return o.map(sortObject);
      
      const record = o as Record<string, unknown>;
      return Object.keys(record).sort().reduce((acc: Record<string, unknown>, key: string) => {
        const val = record[key];
        // Treat undefined as non-existent for canonical comparison
        if (val !== undefined) {
          acc[key] = sortObject(val);
        }
        return acc;
      }, {});
    };

    const canonicalJson = JSON.stringify(sortObject(cleanObj));
    const encoder = new TextEncoder();
    const data = encoder.encode(canonicalJson);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generates a SHA-256 hash of the manifest object (alias for backward compatibility).
   */
  static async generateManifestHash(manifest: OMEGA_Manifest): Promise<string> {
    return this.generateHash(manifest as unknown as Record<string, unknown>);
  }

  /**
   * Verifies if an object matches a given hash.
   */
  static async verifyIntegrity(obj: Record<string, unknown>, expectedHash: string): Promise<boolean> {
    const currentHash = await this.generateHash(obj);
    return currentHash === expectedHash;
  }
}
