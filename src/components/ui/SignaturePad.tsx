"use client";

import { useEffect, useRef } from "react";

export default function SignaturePad({
  onSave,
}: {
  onSave: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const start = (e: PointerEvent) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      drawingRef.current = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const move = (e: PointerEvent) => {
      if (!drawingRef.current) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const end = (e: PointerEvent) => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      canvas.releasePointerCapture(e.pointerId);
      onSave(canvas.toDataURL());
    };

    canvas.addEventListener("pointerdown", start, { passive: false });
    canvas.addEventListener("pointermove", move, { passive: false });
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("pointerdown", start);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", end);
      canvas.removeEventListener("pointercancel", end);
    };
  }, [onSave]);

  const clear = () => {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="flex flex-col space-y-6">
      <p className="font-semibold">Client Signature</p>

      <canvas
        ref={canvasRef}
        className="border rounded bg-white w-full h-48"
        style={{
          touchAction: "none",
          overscrollBehavior: "contain",
        }}
      />

      <button
        onClick={()=> {clear(); }}
        className="text-lg underline text-red-600"
      >
        Clear
      </button>
    </div>
  );
}
