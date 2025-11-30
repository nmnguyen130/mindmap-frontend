import { useEffect, useRef, useState } from "react";

interface FPSMetrics {
  current: number;
  average: number;
}

export function useFPSDetection() {
  // In production, return a no-op implementation to avoid
  // unnecessary performance measurements and overlays.
  if (!__DEV__) {
    const noop = () => {};
    return {
      isInteracting: false,
      fpsMetrics: { current: 0, average: 0 },
      startInteraction: noop,
      stopInteraction: noop,
    };
  }

  const [isInteracting, setIsInteracting] = useState(false);
  const [fpsMetrics, setFpsMetrics] = useState<FPSMetrics>({
    current: 0,
    average: 0,
  });

  const frameCount = useRef(0);
  const lastFrameTime = useRef(0);
  const fpsHistory = useRef<number[]>([]);
  const isInteractingRef = useRef(false);
  const animationFrameId = useRef<number | null>(null);

  const startInteraction = () => {
    if (!isInteractingRef.current) {
      isInteractingRef.current = true;
      setIsInteracting(true);
      frameCount.current = 0;
      lastFrameTime.current = performance.now();
      fpsHistory.current = [];
    }
  };

  const stopInteraction = () => {
    isInteractingRef.current = false;
    setIsInteracting(false);
  };

  useEffect(() => {
    if (isInteracting) {
      const animate = (currentTime: number) => {
        if (!isInteractingRef.current) return;

        frameCount.current++;

        // Calculate FPS every second for accuracy
        if (frameCount.current >= 60) {
          // Sample over 60 frames (~1 second at 60fps)
          const deltaTime = currentTime - lastFrameTime.current;
          const fps = Math.round((frameCount.current * 1000) / deltaTime);

          // Update history (keep last 10 measurements)
          fpsHistory.current.push(fps);
          if (fpsHistory.current.length > 10) {
            fpsHistory.current.shift();
          }

          // Calculate metrics
          const current = fps;
          const average = Math.round(
            fpsHistory.current.reduce((sum, f) => sum + f, 0) /
              fpsHistory.current.length
          );

          setFpsMetrics({ current, average });

          // Reset for next measurement
          frameCount.current = 0;
          lastFrameTime.current = currentTime;
        }

        animationFrameId.current = requestAnimationFrame(animate);
      };

      animationFrameId.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [isInteracting]);

  return {
    isInteracting,
    fpsMetrics,
    startInteraction,
    stopInteraction,
  };
}
