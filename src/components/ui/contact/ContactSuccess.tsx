import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Button } from "../Button";

interface ContactSuccessProps {
  onReset: () => void;
  t: (key: string) => string;
}

export function ContactSuccess({ onReset, t }: ContactSuccessProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-20 space-y-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border border-primary/30">
          <CheckCircle2 size={40} className="text-primary" />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-3xl font-headline font-black italic uppercase tracking-tighter text-white">
          {t("successTitle")}
        </h3>
        <p className="text-zinc-500 font-body max-w-sm mx-auto">
          {t("successDesc")}
        </p>
      </div>
      <Button 
        variant="outline" 
        onClick={onReset}
        className="px-8 border-white/10"
      >
        {t("newTransmission")}
      </Button>
    </motion.div>
  );
}
