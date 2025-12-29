import React, { useEffect, useRef } from 'react';
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
}

export function PostGrid({ 
  posts, 
  isLoading, 
  onPostClick, 
  onDownload,
  onLoadMore,
  hasMore 
}: PostGridProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cooldownRef = useRef(false);
  const cooldownTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!onLoadMore || !hasMore) return;
    if (typeof window === 'undefined' || !("IntersectionObserver" in window)) return;

    const el = sentinelRef.current;
    if (!el) return;

    // find nearest scrollable ancestor to use as root (fallback to viewport)
    const findScrollParent = (node: HTMLElement | null): HTMLElement | null => {
      while (node) {
        const style = window.getComputedStyle(node);
        const overflowY = style.overflowY;
        // common scrollable values
        if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return node;
        // sometimes overflow is 'visible' but the element is scrollable (content larger than container)
        if (node.scrollHeight > node.clientHeight) return node;
        node = node.parentElement;
      }
      return null;
    };

    const rootEl = findScrollParent(el) || null;

    // create observer once and store in ref
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoading && !cooldownRef.current) {
            // stop observing while we load to avoid rapid retriggers
            try {
              observerRef.current?.unobserve(el);
            } catch (e) {
              /* ignore */
            }
            // set a short cooldown to guard against rapid retriggers
            cooldownRef.current = true;
            // kick off load
            onLoadMore();
            // ensure we clear any existing timer
            if (cooldownTimerRef.current) {
              clearTimeout(cooldownTimerRef.current);
            }
            // re-enable after cooldown (ms)
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
      // use a larger rootMargin and a low threshold to trigger earlier
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

  // Re-observe when loading finished and there are more items
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (!observerRef.current) return;

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
    <div className="px-2">
      <div className="masonry-grid">
        {posts.map((post, index) => (
          <PostCard
            key={`${post.id}-${index}`}
            post={post}
            index={index}
            onClick={() => onPostClick(post)}
            onDownload={() => onDownload(post)}
          />
        ))}
      </div>

      <div ref={sentinelRef} className="w-full h-1" aria-hidden="true" />

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Fallback button for environments without IntersectionObserver */}
      {!isLoading && hasMore && onLoadMore && (typeof window === 'undefined' || !("IntersectionObserver" in window)) && (
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
  );
}
