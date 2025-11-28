'use client';

import { motion } from 'motion/react';

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
}

export function Modal({ children }: ModalProps) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-b from-amber-500/30 via-amber-500/10 to-transparent rounded-3xl blur-xl" />
        <motion.div
          className="relative bg-gradient-to-b from-[#12121f] to-[#0a0a12] border border-amber-500/20 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
        >
          {children}
        </motion.div>
      </div>
    </motion.div>
  );
}
