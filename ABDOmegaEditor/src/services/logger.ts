/**
 * @purpose Logger con niveles (debug/info/warn/error) para servicios y bridges de OMEGA, sustituyendo los console.log/debug/warn/error dispersos.
 * @purpose_en Leveled logger (debug/info/warn/error) for OMEGA services and bridges, replacing scattered console.log/debug/warn/error calls.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:5,imports:0,sig:new
 * @lastUpdated 2026-08-21
 */

/**
 * OMEGA LOGGER — ERA 7.2.3
 * Niveles filtrables por umbral global. El nivel por defecto viene de
 * `NEXT_PUBLIC_OMEGA_LOG_LEVEL` / `OMEGA_LOG_LEVEL` (o 'info' si no se declara),
 * de modo que `debug` queda apagado salvo configuración explícita.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveDefaultLevel(): LogLevel {
  if (typeof process !== 'undefined' && process.env) {
    const raw =
      process.env.NEXT_PUBLIC_OMEGA_LOG_LEVEL ||
      process.env.OMEGA_LOG_LEVEL;
    if (raw && raw in LEVEL_RANK) return raw as LogLevel;
  }
  return 'info';
}

let currentLevel: LogLevel = resolveDefaultLevel();

/** Cambia el umbral global de logging (debug < info < warn < error). */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function getLogLevel(): LogLevel {
  return currentLevel;
}

export function isLevelEnabled(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[currentLevel];
}

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * createLogger — Crea un logger con namespace fijo.
 * Formato de salida: `[NAMESPACE] [LEVEL] message ...args`.
 * Delega en los métodos reales de `console` (log/warn/error) para que los
 * spies de console en tests sigan funcionando.
 */
export function createLogger(namespace: string): Logger {
  const make =
    (level: LogLevel, method: 'log' | 'warn' | 'error') =>
    (message: string, ...args: unknown[]): void => {
      if (!isLevelEnabled(level)) return;
      if (typeof console === 'undefined') return;
      const line = `[${namespace}] [${level.toUpperCase()}] ${message}`;
      if (args.length > 0) console[method](line, ...args);
      else console[method](line);
    };

  return {
    debug: make('debug', 'log'),
    info: make('info', 'log'),
    warn: make('warn', 'warn'),
    error: make('error', 'error'),
  };
}
