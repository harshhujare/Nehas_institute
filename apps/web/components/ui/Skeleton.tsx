import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

export function Skeleton({
  width,
  height,
  rounded = 'md',
  style,
  className = '',
  ...props
}: SkeletonProps) {
  const customStyles: React.CSSProperties = {
    ...style,
    ...(width !== undefined && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height !== undefined && { height: typeof height === 'number' ? `${height}px` : height }),
  };

  return (
    <div
      className={`skeleton skeleton--rounded-${rounded} ${className}`}
      style={customStyles}
      aria-hidden="true"
      {...props}
    >
      <style>{`
        .skeleton {
          background: var(--skeleton-bg);
          position: relative;
          overflow: hidden;
        }

        .skeleton::after {
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.08),
            transparent
          );
          animation: shimmer 1.5s infinite;
          content: '';
        }

        .skeleton--rounded-sm { border-radius: 6px; }
        .skeleton--rounded-md { border-radius: 12px; }
        .skeleton--rounded-lg { border-radius: 18px; }
        .skeleton--rounded-full { border-radius: 9999px; }

        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

export default Skeleton;
