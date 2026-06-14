/**
 * @purpose Genera la cabecera de un componente de interfaz de usuario (UI) para mostrar información básica sobre un elemento en el editor de manifiestos OMEGA.
 * @lastUpdated 2026-06-14T15:31:16.542Z
 */


interface CardHeaderProps {
  name: string;
  tagline: string;
  version: string;
  primaryColor: string;
}

export function CardHeader({ name, tagline, version, primaryColor }: CardHeaderProps) {
  return (
    <div className="flex justify-between items-start gap-4">
      <div>
        <h3 className="font-headline text-3xl font-black italic uppercase leading-none mb-2 tracking-tighter">
          {name}
        </h3>
        <p className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] cyan-bloom" style={{ color: primaryColor }}>
          {tagline}
        </p>
      </div>
      <span className="text-[10px] font-headline font-bold text-zinc-600 bg-white/5 px-2 py-1 border border-white/5">
        {version}
      </span>
    </div>
  );
}
