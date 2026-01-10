import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { E621Post } from '@/types/e621';
import { PostCard } from './PostCard';
import { Loader2 } from 'lucide-react';

interface PostGridProps {
  posts: E621Post[];
  isLoading: boolean;
  onPostClick: (post: E621Post) => void;
  onDownload: (post: E621Post) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  columnCount?: number; // responsive column count
}

/**
 * PostGrid with Virtual Scrolling for optimal performance
 * - Renders only visible items (virtual scrolling)
 * - Supports responsive column layouts
 * - Lazy loading with IntersectionObserver
 * - Maintains scroll position and smooth scrolling
 */
export function PostGrid({ 
  posts, 
  isLoading, 
  onPostClick, 
  onDownload,
  onLoadMore,
  hasMore,
  columnCount = 2,
}: PostGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cooldownRef = useRef(false);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate rows based on column count and posts
  const rows = useMemo(() => {
    const rowCount = Math.ceil(posts.length / columnCount);
    return Array.from({ length: rowCount }, (_, i) => 
      posts.slice(i * columnCount, (i + 1) * columnCount)
    );
  }, [posts, columnCount]);

  // Virtual scrolling setup
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 320, // estimated height of each row (adjust based on your card height)
    overscan: 10, // render 10 extra rows outside viewport for smoother scrolling
    measureElement: typeof window !== 'undefined' 
      ? (element) => element?.getBoundingClientRect().height
      : undefined,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows?.[0]?.start ?? 0 : 0;
  const paddingBottom = virtualRows.length > 0 
    ? totalSize - (virtualRows?.[virtualRows.length - 1]?.end ?? 0)
    : 0;

  // Setup infinite scroll sentinel
  useEffect(() => {
    if (!onLoadMore || !hasMore) return;
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const el = sentinelRef.current;
    if (!el) return;

    // Find nearest scrollable ancestor
    const findScrollParent = (node: HTMLElement | null): HTMLElement | null => {
      while (node) {
        const style = window.getComputedStyle(node);
        const overflowY = style.overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return node;
        if (node.scrollHeight > node.clientHeight) return node;
        node = node.parentElement;
      }
      return null;
    };

    const rootEl = findScrollParent(el) || parentRef.current;

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
            cooldownTimerRef.current = setTimeout(() => {
              cooldownRef.current = false;
              try {
                if (observerRef.current && el) observerRef.current.observe(el);
              } catch (e) {
                /* ignore */
              }
            }, 1200);
          }
        });
      },
      { root: rootEl, rootMargin: '600px', threshold: 0.01 }
    );

    observerRef.current.observe(el);

    return () => {
      observerRef.current?.disconnect();
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, [onLoadMore, hasMore, isLoading]);

  // Re-observe when loading finished
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

  if (!isLoading && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-lg">No posts found</p>
        <p className="text-sm">Try different search tags</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div
        ref={parentRef}
        className="w-full overflow-auto"
        style={{ height: '100vh' }}
      >
        div>
          {/* Virtual scrolling container */}
          <div
            style={{
              height: `${totalSize}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            <div
              style={{
                transform: `translateY(${paddingTop}px)`,
              }}
            >
              {virtualRows.map((virtualRow) => {
                const rowItems = rows[virtualRow.index];
                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
            className="grid gap-2 mb-2"                    style={{
                      gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                                  gridAutoRows: 'max-content',
                    }}
                  >
                    {rowItems.map((post) => (
                      <PostCard
                        key={`${post.id}`}
                        post={post}
                        index={posts.indexOf(post)}
                        onClick={() => onPostClick(post)}
                        onDownload={() => onDownload(post)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-center py-8 sticky bottom-0">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Intersection sentinel for infinite scroll */}
          <div ref={sentinelRef} className="w-full h-1" aria-hidden="true" />

          {/* Fallback button for no IntersectionObserver */}
          {!isLoading && hasMore && onLoadMore && 
            (typeof window === 'undefined' || !('IntersectionObserver' in window)) && (
            <div className="flex justify-center py-6">
              <button
                onClick={onLoadMore}
                className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
