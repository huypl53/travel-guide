"use client";

interface PriorityStarsProps {
  value: number;
  onChange: (value: number) => void;
}

export function PriorityStars({ value, onChange }: PriorityStarsProps) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          className={`text-sm ${star <= value ? "text-yellow-500" : "text-gray-300"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
