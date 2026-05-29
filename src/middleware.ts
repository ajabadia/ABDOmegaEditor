import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

/**
 * OMEGA ERA 7 MIDDLEWARE
 * Standardized next-intl integration for Next.js 15/16.
 */
export default createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
