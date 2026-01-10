import React, { useEffect, useRef, useState, useCallback } from 'react';
import { E621Post } from '@/types/e621';
import { PostCard } from './PostCard';
import { Loader2 } from 'lucide-react';

interface VirtualPostGridProps {
  posts: E621Post[];
  isLoading: boolean;
  onPostClick: (post: E621Post) => void;
  onDownload: (post: E621Post) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

/**
 * Virtual scrolling implementation for optimal performance with large lists
 * Only renders posts that are visible in the viewport + buffer
 * Significantly reduces memory usage and improves scrolling performance
 */
export function VirtualPostGrid({ 
  posts, 
  isLoading, 
  onPostClick, 
  onDownload,
  onLoadMore,
  hasMore 
}: VirtualPostGridProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cooldownRef = useRef(false);
  const cooldownTimerRef = useRef<number | undefined>(undefined);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  
  // Virtual scrolling state
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map());
  const [scrollTop, setScrollTop] = useState(0);
  
  // Configuration
  const BUFFER_SIZE = 10; // Number of items to render beyond viewport
  const ESTIMATED_ITEM_HEIGHT = 280; // Estimated height for unknown items
  const COLUMNS = 2; // Number of columns in the grid

  /**
   * Calculate which items should be visible based on scroll position
   */
  const calculateVisibleRange = useCallback(() => {
    if (!containerRef.current) return;

    const scrollTop = containerRef.current.scrollTop;
    const viewportHeight = containerRef.current.clientHeight;
    
    let currentHeight = 0;
    let startIndex = 0;
    let endIndex = posts.length;

    // Find start index
    for (let i = 0; i < posts.length; i += COLUMNS) {
      const rowHeight = Math.max(
        itemHeights.get(i) || ESTIMATED_ITEM_HEIGHT,
        itemHeights.get(i + 1) || ESTIMATED_ITEM_HEIGHT
      );
      
      if (currentHeight + rowHeight > scrollTop) {
        startIndex = Math.max(0, i - (BUFFER_SIZE * COLUMNS));
        break;
      }
      currentHeight += rowHeight;
    }

    // Find end index
    currentHeight = 0;
    for (let i = 0; i < posts.length; i += COLUMNS) {
      const rowHeight = Math.max(
        itemHeights.get(i) || ESTIMATED_ITEM_HEIGHT,
        itemHeights.get(i + 1) || ESTIMATED_ITEM_HEIGHT
      );
      currentHeight += rowHeight;
      
      if (currentHeight > scrollTop + viewportHeight) {
        endIndex = Math.min(posts.length, i + (BUFFER_SIZE * COLUMNS));
        break;
      }
    }

    setVisibleRange({ start: startIndex, end: endIndex });
    setScrollTop(scrollTop);
  }, [posts.length, itemHeights]);

  /**
   * Handle scroll events with throttling
   */
  const handleScroll = useCallback(() => {
    calculateVisibleRange();
  }, [calculateVisibleRange]);

  /**
   * Store measured heights of rendered items
   */
  const updateItemHeight = useCallback((index: number, height: number) => {
    setItemHeights(prev => {
      if (prev.get(index) === height) return prev;
      const newMap = new Map(prev);
      newMap.set(index, height);
      return newMap;
    });
  }, []);

  /**
   * Calculate total height for virtual scrolling
   */
  const getTotalHeight = useCallback(() => {
    let totalHeight = 0;
    for (let i = 0; i < posts.length; i += COLUMNS) {
      const rowHeight = Math.max(
        itemHeights.get(i) || ESTIMATED_ITEM_HEIGHT,
        itemHeights.get(i + 1) || ESTIMATED_ITEM_HEIGHT
      );
      totalHeight += rowHeight;
    }
    return totalHeight;
  }, [posts.length, itemHeights]);

  /**
   * Calculate offset for visible items
   */
  const getOffsetTop = useCallback(() => {
    let offset = 0;
    const { start } = visibleRange;
    
    for (let i = 0; i < start; i += COLUMNS) {
      const rowHeight = Math.max(
        itemHeights.get(i) || ESTIMATED_ITEM_HEIGHT,
        itemHeights.get(i + 1) || ESTIMATED_ITEM_HEIGHT
      );
      offset += rowHeight;
    }
    
    return offset;
  }, [visibleRange, itemHeights]);

  // Setup scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number;
    const throttledScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        handleScroll();
        rafId = 0;
      });
    };

    container.addEventListener('scroll', throttledScroll, { passive: true });
    
    // Initial calculation
    calculateVisibleRange();

    return () => {
      container.removeEventListener('scroll', throttledScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [handleScroll, calculateVisibleRange]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (!onLoadMore || !hasMore) return;
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const el = sentinelRef.current;
    if (!el) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoading && !cooldownRef.current) {
            try {
              observerRef.current?.unobserve(el);
            } catch (e) {
              /* ignore */
            }
            
            cooldownRef.current = true;
            onLoadMore();
            
            if (cooldownTimerRef.current) {
              clearTimeout(cooldownTimerRef.current);
            }
            
            cooldownTimerRef.current = window.setTimeout(() => {
              cooldownRef.current = false;
              try {
                if (observerRef.current && el) observerRef.current.observe(el);
              } catch (e) {
                /* ignore */
              }
            }, 1200) as unknown as number;
          }
        });
      },
      { rootMargin: '600px', threshold: 0.01 }
    );

    observerRef.current.observe(el);
    
    return () => {
      observerRef.current?.disconnect();
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, [onLoadMore, hasMore, isLoading]);

  // Re-observe when loading finishes
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !observerRef.current) return;

    if (!isLoading && hasMore) {
      try {
        observerRef.current.observe(el);
      } catch (e) {
        /* ignore */
      }
    }
  }, [isLoading, hasMore]);

  // Recalculate when posts change
  useEffect(() => {
    calculateVisibleRange();
  }, [posts.length, calculateVisibleRange]);

  if (!isLoading && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-lg">Nessun post trovato</p>
        <p className="text-sm">Prova con altri tag</p>
      </div>
    );
  }

  const { start, end } = visibleRange;
  const visiblePosts = posts.slice(start, end);
  const totalHeight = getTotalHeight();
  const offsetTop = getOffsetTop();

  return (
    <div ref={containerRef} className="h-full overflow-y-auto px-2">
      {/* Virtual scroll container */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <div
          style={{
            position: 'absolute',
            top: offsetTop,
            left: 0,
            right: 0,
          }}
        >
          <div className="masonry-grid">
            {visiblePosts.map((post, idx) => {
              const actualIndex = start + idx;
              return (
                <MeasuredPostCard
                  key={`${post.id}-${actualIndex}`}
                  post={post}
                  index={actualIndex}
                  onClick={() => onPostClick(post)}
                  onDownload={() => onDownload(post)}
                  onHeightChange={(height) => updateItemHeight(actualIndex, height)}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div ref={sentinelRef} className="w-full h-1" aria-hidden="true" />

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Fallback for no IntersectionObserver */}
      {!isLoading && hasMore && onLoadMore && typeof window !== 'undefined' && !('IntersectionObserver' in window) && (
        <div className="flex justify-center py-6">
          <button
            onClick={onLoadMore}
            className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
          >
            Carica altro
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Wrapper for PostCard that measures its height
 */
interface MeasuredPostCardProps {
  post: E621Post;
  index: number;
  onClick: () => void;
  onDownload: () => void;
  onHeightChange: (height: number) => void;
}

const MeasuredPostCard = React.memo(function MeasuredPostCard({
  post,
  index,
  onClick,
  onDownload,
  onHeightChange,
}: MeasuredPostCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || typeof window === 'undefined' || !('ResizeObserver' in window)) return;

    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        if (height > 0) {
          onHeightChange(height);
        }
      }
    });

    resizeObserverRef.current.observe(card);

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [onHeightChange]);

  return (
    <div ref={cardRef}>
      <PostCard
        post={post}
        index={index}
        onClick={onClick}
        onDownload={onDownload}
      />
    </div>
  );
});
