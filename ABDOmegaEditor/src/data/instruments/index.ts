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
