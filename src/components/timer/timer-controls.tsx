import React from 'react';
import { motion } from 'framer-motion';

interface TimerControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

export const TimerControls: React.FC<TimerControlsProps> = ({
  isRunning,
  onStart,
  onPause,
  onReset,
}) => {
  return (
    <div className="flex justify-center space-x-4">
      <motion.button
        className={isRunning ? 'btn-secondary' : 'btn-primary'}
        onClick={isRunning ? onPause : onStart}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {isRunning ? '一時停止' : '開始'}
      </motion.button>

      <motion.button
        className="btn-secondary"
        onClick={onReset}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        リセット
      </motion.button>
    </div>
  );
};
