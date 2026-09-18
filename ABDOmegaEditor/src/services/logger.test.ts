/**
 * Tests for the leveled logger — filtrado por umbral, prefijo de namespace y
 * delegación a los métodos reales de console (spies compatibles).
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createLogger, setLogLevel, getLogLevel, isLevelEnabled } from './logger';

const log = createLogger('TEST-NS');

beforeEach(() => {
  jest.restoreAllMocks();
  setLogLevel('info');
});

afterEach(() => {
  jest.restoreAllMocks();
  setLogLevel('info');
});

describe('logger — niveles', () => {
  it('info/warn/error delegan en console con prefijo [NS] [LEVEL]', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    log.info('hello info');
    log.warn('hello warn');
    log.error('hello error', { code: 42 });

    expect(logSpy).toHaveBeenCalledWith('[TEST-NS] [INFO] hello info');
    expect(warnSpy).toHaveBeenCalledWith('[TEST-NS] [WARN] hello warn');
    expect(errorSpy).toHaveBeenCalledWith('[TEST-NS] [ERROR] hello error', { code: 42 });
  });

  it('debug queda suprimido por defecto (nivel info)', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    log.debug('secret detail');

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('setLogLevel(debug) habilita debug', () => {
    setLogLevel('debug');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    log.debug('visible');

    expect(logSpy).toHaveBeenCalledWith('[TEST-NS] [DEBUG] visible');
  });

  it('setLogLevel(error) suprime info y warn pero no error', () => {
    setLogLevel('error');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    log.info('muted');
    log.warn('muted');
    log.error('loud');

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('[TEST-NS] [ERROR] loud');
  });

  it('isLevelEnabled/getLogLevel respetan el umbral', () => {
    expect(getLogLevel()).toBe('info');
    expect(isLevelEnabled('info')).toBe(true);
    expect(isLevelEnabled('warn')).toBe(true);
    expect(isLevelEnabled('debug')).toBe(false);

    setLogLevel('debug');
    expect(getLogLevel()).toBe('debug');
    expect(isLevelEnabled('debug')).toBe(true);
  });
});
