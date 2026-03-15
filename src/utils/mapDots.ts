import maplibregl, { Map as MapLibreMap } from 'maplibre-gl'

export const createStaticDot = (size: number = 100, color: [number, number, number] = [220, 50, 50]): maplibregl.StyleImageInterface => {
  return {
    width: size,
    height: size,
    data: new Uint8Array(size * size * 4) as any,
    onAdd() {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      (this as any).context = canvas.getContext('2d', { willReadFrequently: true });
      const ctx = (this as any).context as CanvasRenderingContext2D;
      const radius = 8;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.5)`;
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      this.data = ctx.getImageData(0, 0, size, size).data as any;
    },
    render() { return true; }
  };
};

export const createPulsingDot = (map: MapLibreMap, size: number = 100, color: [number, number, number] = [220, 50, 50], duration: number = 2000): maplibregl.StyleImageInterface => {
  return {
    width: size,
    height: size,
    data: new Uint8Array(size * size * 4) as any,
    onAdd() {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      (this as any).context = canvas.getContext('2d', { willReadFrequently: true });
    },
    render() {
      const t = (performance.now() % duration) / duration;
      const radius = 8;
      const context = (this as any).context as CanvasRenderingContext2D;
      if (!context) return false;

      context.clearRect(0, 0, size, size);

      for (let i = 0; i < 3; i++) {
        const progress = (t + i / 3) % 1;
        const rippleRadius = radius + (size / 2 - radius) * progress;
        const opacity = 1 - progress;
        context.beginPath();
        context.arc(size / 2, size / 2, rippleRadius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity * 0.5})`;
        context.fill();
      }

      context.beginPath();
      context.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`;
      context.strokeStyle = 'white';
      context.lineWidth = 3;
      context.fill();
      context.stroke();

      this.data = context.getImageData(0, 0, size, size).data as any;
      map.triggerRepaint();
      return true;
    }
  };
};
