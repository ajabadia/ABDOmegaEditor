'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LogTerminal from '../logs/LogTerminal';

interface WorkbenchLogsProps {
  showLogs: boolean;
  setShowLogs: (show: boolean) => void;
  logs: string[];
}

/**
 * WorkbenchLogs (v7.2.3)
 * Floating log terminal with industrial animations.
 */
const WorkbenchLogs = ({ showLogs, setShowLogs, logs }: WorkbenchLogsProps) => {
  return (
    <AnimatePresence>
      {showLogs && (
        <motion.div 
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute bottom-0 left-0 right-0 h-80 z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
        >
          <div className="h-full border-t border-accent/30">
             <LogTerminal logs={logs} />
             <button 
               onClick={() => setShowLogs(false)}
               className="absolute top-2 right-4 p-1 text-foreground/20 hover:text-foreground/60 transition-colors"
             >
               <span className="text-[9px] font-black uppercase tracking-widest">Close</span>
             </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WorkbenchLogs;
