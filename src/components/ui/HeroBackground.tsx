"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

interface HeroBackgroundProps {
  src: string;
  alt: string;
}

export function HeroBackground({ src, alt }: HeroBackgroundProps) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  // Moves the image 35% to create a much more noticeable depth effect
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "35%"]);

  return (
    <div ref={ref} className="absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent z-10" />
      <motion.div 
        style={{ y }} 
        className="relative w-full h-[140%] -top-[20%]"
      >
        <Image 
          src={src} 
          alt={alt} 
          fill 
          sizes="100vw"
          className="object-cover opacity-60"
          priority
        />
      </motion.div>
    </div>
  );
}
