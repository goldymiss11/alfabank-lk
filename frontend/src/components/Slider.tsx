interface SliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  className?: string;
  'aria-label'?: string;
}

export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  className = '',
  'aria-label': ariaLabel,
}: SliderProps) {
  const pct = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;

  return (
    <div className={`relative flex items-center w-full py-1.5 ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer focus:outline-none transition-all
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-[#EF3124]
          [&::-webkit-slider-thumb]:shadow-[0_2px_4px_rgba(0,0,0,0.14)]
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-all
          [&::-webkit-slider-thumb]:duration-150
          [&::-webkit-slider-thumb]:hover:scale-110
          [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-white
          [&::-moz-range-thumb]:border-2
          [&::-moz-range-thumb]:border-[#EF3124]
          [&::-moz-range-thumb]:shadow-[0_2px_4px_rgba(0,0,0,0.14)]
          [&::-moz-range-thumb]:cursor-pointer
          [&::-moz-range-thumb]:transition-all
          [&::-moz-range-thumb]:duration-150
          [&::-moz-range-thumb]:hover:scale-110"
        style={{
          background: `linear-gradient(to right, #EF3124 0%, #EF3124 ${pct}%, #E5E7EB ${pct}%, #E5E7EB 100%)`,
        }}
      />
    </div>
  );
}

