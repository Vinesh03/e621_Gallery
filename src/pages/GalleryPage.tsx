import { useState, useEffect, useCallback, useRef } from 'react';
import { E621Post } from '@/types/e621';
import { e621Api } from '@/services/e621Api';
import { useSettingsStore, useSearchStore, useAuthStore } from '@/stores/appStore';
import { PostGrid } from '@/components/gallery/PostGrid';
import { PostViewer } from '@/components/gallery/PostViewer';
import { SearchBar } from '@/components/gallery/SearchBar';
import { FilterSheet } from '@/components/gallery/FilterSheet';
import { ShortsViewer } from '@/components/gallery/ShortsViewer';
import { SplashScreen } from '@/components/SplashScreen';
import { ConnectionError } from '@/components/ConnectionError';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LayoutGrid, Play, RefreshCw } from 'lucide-react';
import { UserMenu } from '@/components/gallery/UserMenu';
import { AnimatePresence, motion } from 'framer-motion';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buongiorno';
  if (hour < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

export default function GalleryPage() {
  const [posts, setPosts] = useState<E621Post[]>([]);
  const [shortsPosts, setShortsPosts] = useState<E621Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isShortsLoading, setIsShortsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [shortsPage, setShortsPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [hasMoreShorts, setHasMoreShorts] = useState(true);
  const [selectedPost, setSelectedPost] = useState<E621Post | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [connectionError, setConnectionError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartY = useRef<number>(0);
  const isPulling = useRef(false);
  
  // Swipe handling for view mode switching
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const { ratingFilter, mediaFilter, viewMode, setViewMode, hasShownInitialSplash, setHasShownInitialSplash } = useSettingsStore();
  const { currentTags, setCurrentTags, getCachedPosts, setCachedPosts } = useSearchStore();
  const { credentials, isGuest, isFirstLogin, setNotFirstLogin } = useAuthStore();

  // Show splash only on first app load
  const [showSplash, setShowSplash] = useState(!hasShownInitialSplash);

  // Hide splash after 2 seconds and mark as shown
  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
        setHasShownInitialSplash(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSplash, setHasShownInitialSplash]);

  // Show greeting toast on first login
  useEffect(() => {
    if (credentials && isFirstLogin) {
      const greeting = getGreeting();
      toast.success(`${greeting}, ${credentials.username}!`, {
        description: 'Bentornato su e621 Gallery',
      });
      setNotFirstLogin();
    }
  }, [credentials, isFirstLogin, setNotFirstLogin]);

  const fetchPosts = useCallback(async (searchTags: string, pageNum: number, append = false, isInitialLoad = false) => {
    // On initial load, always try cache first
    if (pageNum === 1 && !append) {
      const cachedPosts = getCachedPosts(searchTags, ratingFilter, mediaFilter);
      if (cachedPosts && cachedPosts.length > 0) {
        setPosts(cachedPosts);
        setHasMore(cachedPosts.length === 40);
        // Only background refresh on initial load, not during active usage
        if (isInitialLoad) {
          fetchPostsInBackground(searchTags);
        }
        return;
      }
    }

    setIsLoading(true);
    setConnectionError(false);
    try {
      const newPosts = await e621Api.searchPosts({
        tags: searchTags,
        limit: 40,
        page: pageNum,
        rating: ratingFilter,
        mediaType: mediaFilter,
      });
      
      if (append) {
        setPosts(prev => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
        // Cache first page results
        if (pageNum === 1) {
          setCachedPosts(newPosts, searchTags, ratingFilter, mediaFilter);
        }
      }
      setHasMore(newPosts.length === 40);
    } catch (error) {
      console.error(error);
      if (!append && posts.length === 0) {
        setConnectionError(true);
      } else {
        toast.error('Impossibile caricare i post');
      }
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
    }
  }, [ratingFilter, mediaFilter, getCachedPosts, setCachedPosts, posts.length]);

  // Background fetch to update cache with new posts
  const fetchPostsInBackground = useCallback(async (searchTags: string) => {
    try {
      const newPosts = await e621Api.searchPosts({
        tags: searchTags,
        limit: 40,
        page: 1,
        rating: ratingFilter,
        mediaType: mediaFilter,
      });
      
      const cachedPosts = getCachedPosts(searchTags, ratingFilter, mediaFilter);
      
      // Check if there are new posts by comparing first post IDs
      if (cachedPosts && newPosts.length > 0 && cachedPosts.length > 0) {
        if (newPosts[0].id !== cachedPosts[0].id) {
          // New posts available, update
          setPosts(newPosts);
          setCachedPosts(newPosts, searchTags, ratingFilter, mediaFilter);
        }
      }
    } catch (error) {
      console.error('Background fetch failed:', error);
    }
  }, [ratingFilter, mediaFilter, getCachedPosts, setCachedPosts]);

  const fetchShortsPosts = useCallback(async (searchTags: string, pageNum: number, append = false) => {
    setIsShortsLoading(true);
    try {
      // For shorts, we fetch videos. If there's a search query, apply aspect ratio filter for vertical videos
      // If no search, show all videos
      let tags = searchTags ? `${searchTags} type:webm` : 'type:webm';
      
      const newPosts = await e621Api.searchPosts({
        tags: tags,
        limit: 20,
        page: pageNum,
        rating: ratingFilter,
      });
      
      if (append) {
        setShortsPosts(prev => [...prev, ...newPosts]);
      } else {
        setShortsPosts(newPosts);
      }
      setHasMoreShorts(newPosts.length === 20);
    } catch (error) {
      toast.error('Impossibile caricare i video');
      console.error(error);
    } finally {
      setIsShortsLoading(false);
    }
  }, [ratingFilter]);

  // Track if this is first render
  const isFirstRenderRef = useRef(true);
  
  useEffect(() => {
    if (viewMode === 'gallery') {
      setPage(1);
      fetchPosts(currentTags, 1, false, isFirstRenderRef.current);
    } else {
      setShortsPage(1);
      fetchShortsPosts(currentTags, 1, false);
    }
    isFirstRenderRef.current = false;
  }, [currentTags, ratingFilter, mediaFilter, viewMode, fetchPosts, fetchShortsPosts]);

  const handleSearch = (tags: string) => {
    setCurrentTags(tags);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(currentTags, nextPage, true);
  };

  const handleLoadMoreShorts = () => {
    const nextPage = shortsPage + 1;
    setShortsPage(nextPage);
    fetchShortsPosts(currentTags, nextPage, true);
  };

  const handleDownload = async (post: E621Post) => {
    const url = e621Api.getDownloadUrl(post);
    if (!url) {
      toast.error('Download non disponibile');
      return;
    }
    // Open in new tab as fallback for CORS
    window.open(url, '_blank');
    toast.success('Download aperto in nuova scheda');
  };

  const openViewer = (post: E621Post) => {
    const index = posts.findIndex(p => p.id === post.id);
    setSelectedPost(post);
    setSelectedIndex(index);
  };

  const handleCloseViewer = (triggerSearch?: boolean) => {
    setSelectedPost(null);
    setSelectedIndex(-1);
    
    // If tags were modified, the search will automatically trigger via useEffect
    if (triggerSearch) {
      // Force refetch
      setPage(1);
      fetchPosts(currentTags, 1, false);
    }
  };

  const handleRetry = () => {
    setIsRetrying(true);
    if (viewMode === 'gallery') {
      fetchPosts(currentTags, 1, false);
    } else {
      fetchShortsPosts(currentTags, 1, false);
    }
  };

  const displayName = credentials?.username || (isGuest ? 'Ospite' : null);

  // Pull-to-refresh handlers
  const PULL_THRESHOLD = 80;
  
  const handlePullStart = (e: React.TouchEvent) => {
    // Only start pull if at top of scroll
    if (contentRef.current && contentRef.current.scrollTop === 0) {
      pullStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  };

  const handlePullMove = (e: React.TouchEvent) => {
    if (!isPulling.current) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - pullStartY.current;
    
    if (distance > 0) {
      setPullDistance(Math.min(distance * 0.5, 100));
    }
  };

  const handlePullEnd = async () => {
    if (pullDistance > PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(60);
      
      try {
        const newPosts = await e621Api.searchPosts({
          tags: currentTags,
          limit: 40,
          page: 1,
          rating: ratingFilter,
          mediaType: mediaFilter,
        });
        setPosts(newPosts);
        setCachedPosts(newPosts, currentTags, ratingFilter, mediaFilter);
        setHasMore(newPosts.length === 40);
        toast.success('Galleria aggiornata');
      } catch (error) {
        toast.error('Errore durante l\'aggiornamento');
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    isPulling.current = false;
  };

  // Handle swipe to change view mode
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    handlePullStart(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handlePullMove(e);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = touchStartY.current - touchEndY;
    
    // Handle pull-to-refresh first
    if (isPulling.current && pullDistance > 0) {
      handlePullEnd();
      return;
    }
    
    // Only trigger if horizontal swipe is dominant and significant
    if (Math.abs(diffX) > 80 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX > 0 && viewMode === 'gallery') {
        // Swipe left -> go to Shorts
        setViewMode('shorts');
      } else if (diffX < 0 && viewMode === 'shorts') {
        // Swipe right -> go to Gallery (handled in ShortsViewer)
      }
    }
  };

  return (
    <>
      <AnimatePresence>
        {showSplash && <SplashScreen />}
      </AnimatePresence>

      <div 
        ref={contentRef}
        className="min-h-screen bg-background"
        onTouchStart={viewMode === 'gallery' ? handleTouchStart : undefined}
        onTouchMove={viewMode === 'gallery' ? handleTouchMove : undefined}
        onTouchEnd={viewMode === 'gallery' ? handleTouchEnd : undefined}
      >
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && viewMode === 'gallery' && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center bg-background z-50 transition-all"
          style={{ height: pullDistance, paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
        >
          <RefreshCw 
            className={cn(
              "w-6 h-6 text-primary transition-transform",
              isRefreshing && "animate-spin",
              pullDistance > 80 && "scale-110"
            )} 
          />
        </div>
      )}
      {/* Header */}
      <header
        className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border"
        style={{ paddingTop: 'max(env(safe-area-inset-top), var(--safe-area-inset-top, 12px))' }}
      >
        <div className="container py-3">
          {/* User menu - fixed height to prevent layout shift */}
          <div className="flex items-center justify-end mb-2 min-h-[24px]">
            <UserMenu />
          </div>
          
          {/* View mode toggle */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setViewMode('gallery')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-colors",
                viewMode === 'gallery'
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="font-medium text-sm">Galleria</span>
            </button>
            <button
              onClick={() => setViewMode('shorts')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-colors",
                viewMode === 'shorts'
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80"
              )}
            >
              <Play className="w-4 h-4" />
              <span className="font-medium text-sm">Shorts</span>
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <SearchBar onSearch={handleSearch} />
            </div>
            <FilterSheet />
          </div>
        </div>
      </header>

      {/* Content */}
      {connectionError ? (
        <ConnectionError onRetry={handleRetry} isRetrying={isRetrying} />
      ) : viewMode === 'gallery' ? (
        <main className="py-4">
          <PostGrid
            posts={posts}
            isLoading={isLoading}
            onPostClick={openViewer}
            onDownload={handleDownload}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
          />
        </main>
      ) : (
        <ShortsViewer
          posts={shortsPosts}
          isLoading={isShortsLoading}
          onLoadMore={handleLoadMoreShorts}
          hasMore={hasMoreShorts}
          onExit={() => setViewMode('gallery')}
        />
      )}

      {/* Post Viewer */}
      <PostViewer
        post={selectedPost}
        isOpen={!!selectedPost}
        onClose={handleCloseViewer}
        onPrevious={selectedIndex > 0 ? () => {
          setSelectedPost(posts[selectedIndex - 1]);
          setSelectedIndex(selectedIndex - 1);
        } : undefined}
        onNext={selectedIndex < posts.length - 1 ? () => {
          setSelectedPost(posts[selectedIndex + 1]);
          setSelectedIndex(selectedIndex + 1);
        } : undefined}
        hasPrevious={selectedIndex > 0}
        hasNext={selectedIndex < posts.length - 1}
      />
      </div>
    </>
  );
}
