"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PriorityStarsProps {
  value: number;
  onChange: (value: number) => void;
}

const priorityLabels = ["", "Low", "Below avg", "Normal", "High", "Must visit"];

export function PriorityStars({ value, onChange }: PriorityStarsProps) {
  return (
    <TooltipProvider delay={300}>
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-1" role="group" aria-label="Priority">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Priority</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((level) => (
                <span
                  key={level}
                  role="radio"
                  aria-checked={level <= value}
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(level);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onChange(level);
                    }
                  }}
                  className={`text-xs leading-none cursor-pointer select-none ${level <= value ? "text-blue-500" : "text-gray-300"} hover:text-blue-400`}
                >
                  ●
                </span>
              ))}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">
            {priorityLabels[value]} priority — higher = weighs more in ranking
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
