"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const nextLocale = locale === "en" ? "es" : "en";
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <button
      onClick={toggleLocale}
      className="group relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-primary/50 transition-all"
      aria-label="Switch Language"
    >
      <Languages size={14} className="text-zinc-500 group-hover:text-primary transition-colors" />
      <div className="flex gap-1.5 text-[10px] font-headline font-bold uppercase tracking-widest">
        <span className={cn(locale === "en" ? "text-primary" : "text-zinc-600")}>EN</span>
        <span className="text-zinc-800">/</span>
        <span className={cn(locale === "es" ? "text-primary" : "text-zinc-600")}>ES</span>
      </div>
    </button>
  );
}
