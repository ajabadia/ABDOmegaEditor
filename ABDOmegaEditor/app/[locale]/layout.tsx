/**
 * @purpose Renderiza un componente de disposición para ABDOmegaEditor utilizando NextIntlClientProvider para proporcionar mensajes específicos del lugar y valida los parámetros de lugar entrantes.
 * @fingerprint exports:2,imports:5,sig:1nduqdy
 * @lastUpdated 2026-06-14T19:09:21.834Z
 */

import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {routing} from '@/i18n/routing';
import {notFound} from 'next/navigation';
import type { Metadata } from "next";
import ToastProviderClient from '@/app/ToastProviderClient';

export const metadata: Metadata = {
  title: "ABDSynths | High-End Virtual Instruments",
  description: "Boutique digital studio for premium audio engines and virtual synthesizers.",
};

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as "en" | "es")) {
    notFound();
  }
 
  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();
 
  return (
    <NextIntlClientProvider messages={messages}>
      <ToastProviderClient>
        {children}
      </ToastProviderClient>
    </NextIntlClientProvider>
  );
}
