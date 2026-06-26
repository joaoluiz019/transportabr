import React, { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

const THRESHOLD = 70;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const pulling = useRef(false);

  const handleTouchStart = (e) => {
    const scrollTop = e.currentTarget.closest('[data-main-scroll]')?.scrollTop ?? 0;
    if (scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (startY.current === null || refreshing) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      pulling.current = true;
      setPullY(Math.min(diff * 0.45, THRESHOLD + 20));
    }
  };

  const handleTouchEnd = async () => {
    if (pullY >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullY(50);
      await onRefresh();
      setRefreshing(false);
    }
    pulling.current = false;
    setPullY(0);
    startY.current = null;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {(pullY > 0 || refreshing) && (
        <div
          className="flex items-center justify-center transition-all duration-200"
          style={{ height: `${refreshing ? 50 : pullY}px` }}
        >
          <Loader2
            className={`w-5 h-5 text-emerald-500 ${refreshing ? 'animate-spin' : ''}`}
            style={{ transform: !refreshing ? `rotate(${(pullY / THRESHOLD) * 180}deg)` : undefined }}
          />
        </div>
      )}
      {children}
    </div>
  );
}