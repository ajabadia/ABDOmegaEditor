"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface RenderShowcaseProps {
  instrumentId: string;
  variant?: "black" | "white";
  interval?: number;
  views?: string[];
}

const DEFAULT_VIEWS = ["front", "diagonal", "top", "rear"];

export function RenderShowcase({ 
  instrumentId, 
  variant = "black", 
  interval = 8000,
  views = DEFAULT_VIEWS
}: RenderShowcaseProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % views.length);
    }, interval);

    return () => clearInterval(timer);
  }, [interval, views.length]);

  // Clean instrument name for path (e.g., abd-junio-601 -> junio-601)
  const cleanId = instrumentId.replace("abd-", "");
  
  const currentImage = `/images/renders/${cleanId}/${variant}_${views[currentIndex]}.png`;

  return (
    <div className="relative w-full h-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1.02 }}
          exit={{ opacity: 0, scale: 1 }}
          transition={{ 
            duration: 2, 
            ease: "easeOut" 
          }}
          className="absolute inset-0"
        >
          <Image
            src={currentImage}
            alt={`${instrumentId} ${variant} render ${views[currentIndex]}`}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain"
            priority
          />
        </motion.div>
      </AnimatePresence>

      {/* Preload next image for instant transition */}
      <div className="hidden pointer-events-none">
        <Image
          src={`/images/renders/${cleanId}/${variant}_${views[(currentIndex + 1) % views.length]}.png`}
          alt="preload"
          width={1}
          height={1}
          priority
        />
      </div>

      {/* Industrial Overlay Decor - No borders */}
      <div className="absolute inset-0 pointer-events-none z-20">
        <div className="absolute top-0 left-0 flex gap-2">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(0,240,255,0.5)]" />
          <div className="text-[9px] font-headline text-zinc-500 uppercase tracking-[0.3em]">
            SYSTEM_LINK: ACTIVE
          </div>
        </div>
        <div className="absolute bottom-0 right-0 text-[9px] font-headline text-zinc-700 uppercase tracking-[0.4em]">
          {variant.toUpperCase()} <span className="opacity-30">/</span> {views[currentIndex].toUpperCase()}
        </div>
      </div>
    </div>
  );
}
