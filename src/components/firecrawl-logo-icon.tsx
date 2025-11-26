'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type FirecrawlLogoIconProps = {
  className?: string;
  size?: number;
  animate?: boolean;
};

/**
 * Firecrawl logo as inline SVG with an optional glow/pulse animation.
 * Uses useId to namespace keyframes and avoid collisions.
 */
export function FirecrawlLogoIcon({
  className,
  size = 28,
  animate = true,
}: FirecrawlLogoIconProps) {
  const rawId = React.useId().replace(/:/g, '');
  const animClass = `${rawId}-pulse`;
  const filterId = `${rawId}-heat`;
  const pathId = `${rawId}-path`;

  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 50 72'
      className={cn('shrink-0', className, animate && animClass)}
      aria-hidden='true'
      xmlns='http://www.w3.org/2000/svg'
    >
      {animate ? (
        <style>{`
          .${animClass} {
            animation: ${animClass}-keyframes 2.8s ease-in-out infinite;
            transform-origin: center;
            filter: drop-shadow(0 0 0 rgba(250,93,25,0.25));
          }
          @keyframes ${animClass}-keyframes {
            0% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(250,93,25,0.25)); }
            50% { transform: scale(1.05); filter: drop-shadow(0 0 12px rgba(250,93,25,0.55)); }
            100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(250,93,25,0.25)); }
          }
        `}</style>
      ) : null}
      {animate ? (
        <defs>
          <filter id={filterId}>
            <feTurbulence
              type='fractalNoise'
              baseFrequency='0.018 0.022'
              numOctaves='2'
              seed='8'
              result='noise'
            >
              <animate
                attributeName='baseFrequency'
                dur='6s'
                values='0.018 0.022;0.028 0.035;0.018 0.022'
                repeatCount='indefinite'
              />
            </feTurbulence>
            <feDisplacementMap in='SourceGraphic' in2='noise' scale='8'>
              <animate
                attributeName='scale'
                dur='5s'
                values='6;10;6'
                repeatCount='indefinite'
              />
            </feDisplacementMap>
          </filter>
        </defs>
      ) : null}

      <g>
        <animateTransform
          attributeName='transform'
          type='translate'
          dur='4s'
          values='0 0; 0 -1; 0 0'
          repeatCount='indefinite'
        />
        <path
          id={pathId}
          d='M41.7154 23.1929C38.9531 24.0129 36.8707 25.8677 35.3457 27.8826C35.0183 28.3151 34.3358 27.9901 34.4658 27.4601C37.3856 15.4534 33.5283 5.47401 21.5039 0.561817C20.894 0.311833 20.259 0.859299 20.419 1.49926C25.8887 23.4604 2.88236 21.608 5.78971 46.504C5.83971 46.9314 5.35973 47.2239 5.00975 46.9739C3.9198 46.1915 2.70237 44.5591 1.86741 43.4116C1.62242 43.0742 1.09245 43.1692 0.979951 43.5716C0.314984 45.9765 0 48.2413 0 50.4912C0 59.2407 4.49727 66.9427 11.3044 71.4074C11.6944 71.6624 12.1944 71.2974 12.0619 70.8499C11.7119 69.675 11.5144 68.4351 11.4994 67.1527C11.4994 66.3652 11.5494 65.5603 11.6719 64.8103C11.9569 62.9254 12.6119 61.1305 13.7118 59.4957C17.4841 53.8335 25.0462 48.3638 23.8388 40.9368C23.7613 40.4668 24.3163 40.1569 24.6663 40.4793C29.9935 45.3465 31.0485 51.8936 30.1735 57.7658C30.0985 58.2757 30.7385 58.5482 31.061 58.1482C31.8759 57.1283 32.8709 56.2334 33.9533 55.5609C34.2233 55.3934 34.5833 55.5209 34.6858 55.8209C35.2882 57.5733 36.1832 59.2182 37.0281 60.8631C38.0381 62.8404 38.5756 65.0978 38.4906 67.4877C38.4481 68.6501 38.2556 69.775 37.9331 70.8449C37.7956 71.2974 38.2906 71.6749 38.6881 71.4149C45.5002 66.9502 50 59.2482 50 50.4937C50 47.4514 49.4675 44.4691 48.4601 41.6743C46.3477 35.8121 40.988 31.4099 42.3429 23.7704C42.4079 23.4054 42.0704 23.0879 41.7154 23.1929Z'
          fill='#FA5D19'
          filter={animate ? `url(#${filterId})` : undefined}
        />
      </g>
    </svg>
  );
}
