/**
 * @purpose Exporta e expone los instrumentos disponibles en el editor de manifiestos OMEGA, incluyendo sus tipos y definiciones específicas.
 * @lastUpdated 2026-06-14T15:55:21.438Z
 */

import { junio601 } from "./junio-601";
import { omega } from "./omega";
import { neuronik } from "./neuronik";
import type { Instrument } from "./types";

export * from "./types";
export { junio601, omega, neuronik };

export const instruments: Instrument[] = [
  junio601,
  omega,
  neuronik
];
