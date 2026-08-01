"use client";

import { useEffect, useState } from "react";

export default function FontScaleControl() {
  const [scale, setScale] = useState(100);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const scales = [100, 125, 150];

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("fontScale");
    if (saved) {
      const value = parseInt(saved, 10);
      setScale(value);
      applyScale(value);
    }
  }, []);

  const applyScale = (value: number) => {
    document.documentElement.style.fontSize = `${(value / 100) * 16}px`;
    localStorage.setItem("fontScale", value.toString());
  };

  const handleChange = (newScale: number) => {
    setScale(newScale);
    applyScale(newScale);
    setIsOpen(false);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Ajustar tamaño de fuente: ${scale}%`}
        title={`Tamaño de fuente: ${scale}%`}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors focus-visible:outline-2 focus-visible:outline-primary min-h-[40px]"
      >
        <span className="material-symbols-rounded text-lg" aria-hidden="true">
          text_increase
        </span>
        <span className="text-xs font-semibold hidden sm:inline">{scale}%</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 bg-surface-container-low border border-outline-variant rounded-lg shadow-card p-2 z-50 min-w-[100px]">
          {scales.map((s) => (
            <button
              key={s}
              onClick={() => handleChange(s)}
              className={`block w-full text-left px-3 py-2 rounded text-sm font-semibold transition-colors ${
                scale === s
                  ? "bg-primary text-on-primary"
                  : "text-on-surface hover:bg-surface-container"
              }`}
              aria-current={scale === s ? "true" : undefined}
            >
              {s}%
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
