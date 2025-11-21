import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number; // 0-5
  maxStars?: number;
  size?: number;
  showValue?: boolean;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
}

export function StarRating({
  rating,
  maxStars = 5,
  size = 16,
  showValue = false,
  interactive = false,
  onRatingChange,
  className,
}: StarRatingProps) {
  const handleStarClick = (starIndex: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(starIndex + 1);
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)} data-testid="star-rating">
      {Array.from({ length: maxStars }, (_, index) => {
        const isFilled = index < Math.floor(rating);
        const isPartial = index < rating && index >= Math.floor(rating);
        const fillPercentage = isPartial ? ((rating - Math.floor(rating)) * 100) : 0;

        return (
          <div
            key={index}
            className={cn(
              "relative",
              interactive && "cursor-pointer transition-transform hover:scale-110"
            )}
            onClick={() => handleStarClick(index)}
            data-testid={`star-${index}`}
          >
            {/* Background star (empty) */}
            <Star
              size={size}
              className="text-muted-foreground/30"
              fill="currentColor"
            />
            
            {/* Filled star overlay */}
            {(isFilled || isPartial) && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{
                  width: isPartial ? `${fillPercentage}%` : '100%'
                }}
              >
                <Star
                  size={size}
                  className="text-amber-400 dark:text-amber-500"
                  fill="currentColor"
                />
              </div>
            )}
          </div>
        );
      })}
      
      {showValue && (
        <span className="ml-1 text-sm text-muted-foreground" data-testid="rating-value">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
