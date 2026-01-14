import { useState, useRef, useCallback, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

interface UseDraggableOptions {
  initialPosition?: Position;
  bounds?: 'window' | 'parent' | null;
  snapToEdges?: boolean;
  snapThreshold?: number;
}

interface UseDraggableReturn {
  position: Position;
  isDragging: boolean;
  dragHandlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
  };
  resetPosition: () => void;
}

export function useDraggable(options: UseDraggableOptions = {}): UseDraggableReturn {
  const {
    initialPosition = { x: 0, y: 0 },
    bounds = 'window',
    snapToEdges = true,
    snapThreshold = 20,
  } = options;

  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<Position>({ x: 0, y: 0 });
  const elementStartRef = useRef<Position>({ x: 0, y: 0 });

  const getBounds = useCallback(() => {
    if (bounds === 'window') {
      return {
        minX: 0,
        minY: 0,
        maxX: window.innerWidth - 80,
        maxY: window.innerHeight - 80,
      };
    }
    return null;
  }, [bounds]);

  const constrainPosition = useCallback((pos: Position): Position => {
    const b = getBounds();
    if (!b) return pos;

    let { x, y } = pos;

    // Constrain to bounds
    x = Math.max(b.minX, Math.min(x, b.maxX));
    y = Math.max(b.minY, Math.min(y, b.maxY));

    // Snap to edges
    if (snapToEdges) {
      if (x < snapThreshold) x = 0;
      if (y < snapThreshold) y = 0;
      if (x > b.maxX - snapThreshold) x = b.maxX;
      if (y > b.maxY - snapThreshold) y = b.maxY;
    }

    return { x, y };
  }, [getBounds, snapToEdges, snapThreshold]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;

    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;

    const newPosition = constrainPosition({
      x: elementStartRef.current.x + deltaX,
      y: elementStartRef.current.y + deltaY,
    });

    setPosition(newPosition);
  }, [isDragging, constrainPosition]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse events
  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      handleEnd();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, handleMove, handleEnd]);

  // Touch events
  useEffect(() => {
    if (!isDragging) return;

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchEnd = () => {
      handleEnd();
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    elementStartRef.current = { ...position };
  }, [position]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      elementStartRef.current = { ...position };
    }
  }, [position]);

  const resetPosition = useCallback(() => {
    setPosition(initialPosition);
  }, [initialPosition]);

  return {
    position,
    isDragging,
    dragHandlers: {
      onMouseDown,
      onTouchStart,
    },
    resetPosition,
  };
}
