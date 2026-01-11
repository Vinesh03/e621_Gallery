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
import { LayoutGrid, Play } from 'lucide-react';
import { UserMenu } from '@/components/gallery/UserMenu';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from '@/components/PageTransition';

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buongiorno';
  if (hour < 18) return 'Buon pomeriggio';
  return 'Buonasera';
};

export default function GalleryPage() {
  const [posts, setPosts] = useState<E621Post[]>([]);
  const [shortsPosts, setShortsPosts] = useState<E621Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isShortsLoading, setIsShortsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [shortsPage, setShortsPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [hasMoreShorts, setHasMoreShorts] = useState(true);
  const [selectedPost, setSelectedPost] = useState<E621Post | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [connectionError, setConnectionError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
   const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  
  const pullStartY = useRef<number>(0);
  const isPulling = useRef(false);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const shortsPreloadedRef = useRef(false);
  const isFirstRenderRef = useRef(true);
  const isFetchingRef = useRef(false);
  const pageRef = useRef<number>(page);
  const shortsPageRef = useRef<number>(shortsPage);

  const { ratingFilter, mediaFilter, viewMode, setViewMode, resetViewMode, hasShownInitialSplash, setHasShownInitialSplash, preloadContent } = useSettingsStore();
  const { currentTags, setCurrentTags, getCachedPosts, setCachedPosts } = useSearchStore();
  const { credentials, isGuest, isFirstLogin, setNotFirstLogin } = useAuthStore();

  const [showSplash, setShowSplash] = useState(!hasShownInitialSplash);

  // Always reset to gallery mode on mount
  useEffect(() => {
    resetViewMode();
  }, [resetViewMode]);

  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
        setHasShownInitialSplash(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSplash, setHasShownInitialSplash]);

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
    if (pageNum === 1 && !append) {
      const cachedPosts = getCachedPosts(searchTags, ratingFilter, mediaFilter);
      if (cachedPosts && cachedPosts.length > 0) {
        setPosts(cachedPosts);
        setHasMore(cachedPosts.length === 40);
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
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const filteredNew = newPosts.filter(p => !existingIds.has(p.id));
          if (filteredNew.length === 0) {
            setHasMore(false);
            return prev;
          }
          return [...prev, ...filteredNew];
        });
      } else {
        setPosts(newPosts);
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
      
      if (cachedPosts && newPosts.length > 0 && cachedPosts.length > 0) {
        if (newPosts[0].id !== cachedPosts[0].id) {
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
      const tags = searchTags ? `${searchTags} type:webm` : 'type:webm';
      
      const newPosts = await e621Api.searchPosts({
        tags: tags,
        limit: 20,
        page: pageNum,
        rating: ratingFilter,
      });
      
      if (append) {
        setShortsPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const filteredNew = newPosts.filter(p => !existingIds.has(p.id));
          if (filteredNew.length === 0) {
            setHasMoreShorts(false);
            return prev;
          }
          return [...prev, ...filteredNew];
        });
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

  const preloadShorts = useCallback(async () => {
    if (shortsPreloadedRef.current || !preloadContent) return;
    
    shortsPreloadedRef.current = true;
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const tags = currentTags ? `${currentTags} type:webm` : 'type:webm';
      const preloadedPosts = await e621Api.searchPosts({
        tags: tags,
        limit: 20,
        page: 1,
        rating: ratingFilter,
      });
      
      setShortsPosts(preloadedPosts);
      setHasMoreShorts(preloadedPosts.length === 20);
    } catch (error) {
      console.error('[preloadShorts] Failed:', error);
    }
  }, [currentTags, ratingFilter, preloadContent]);
  
  useEffect(() => {
    if (viewMode === 'gallery') {
      setPage(1);
      pageRef.current = 1;
      fetchPosts(currentTags, 1, false, isFirstRenderRef.current);
      
      if (isFirstRenderRef.current && preloadContent) {
        preloadShorts();
      }
    } else {
      if (shortsPosts.length === 0) {
        setShortsPage(1);
        shortsPageRef.current = 1;
        fetchShortsPosts(currentTags, 1, false);
      }
    }
    isFirstRenderRef.current = false;
  }, [currentTags, ratingFilter, mediaFilter, viewMode, fetchPosts, fetchShortsPosts, preloadShorts, shortsPosts.length, preloadContent]);

  const handleSearch = (tags: string) => {
    setCurrentTags(tags);
    shortsPreloadedRef.current = false;
  };

  const handleLoadMore = async () => {
    if (isFetchingRef.current) return;
        // Auto-refresh gallery when search is initiated
    setPage(1);
    setPosts([]);
    fetchPosts(currentTags, 1, true);
    isFetchingRef.current = true;
    try {
      const nextPage = pageRef.current + 1;
      pageRef.current = nextPage;
      setPage(nextPage);
      await fetchPosts(currentTags, nextPage, true);
    } catch (e) {
      console.error(e);
    } finally {
      isFetchingRef.current = false;
    }
  };

  const handleLoadMoreShorts = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const nextPage = shortsPageRef.current + 1;
      shortsPageRef.current = nextPage;
      setShortsPage(nextPage);
      await fetchShortsPosts(currentTags, nextPage, true);
    } catch (e) {
      console.error(e);
    } finally {
      isFetchingRef.current = false;
    }
  };

  const handleDownload = async (post: E621Post) => {
    const url = e621Api.getDownloadUrl(post);
    if (!url) {
      toast.error('Download non disponibile');
      return;
    }
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
        // Auto-refresh gallery when closing viewer
    setPage(1);
    fetchPosts(currentTags, 1, false);
    
    if (triggerSearch) {
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

  const PULL_THRESHOLD = 80;
  
  const handlePullStart = (e: React.TouchEvent) => {
    if (selectedPost) return;

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
      } catch (error) {
        toast.error('Errore durante l\'aggiornamento');
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    isPulling.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    if (!selectedPost) handlePullStart(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handlePullMove(e);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = touchStartY.current - touchEndY;
    
if (isPulling.current) {      handlePullEnd();
      return;
    }
    
    if (Math.abs(diffX) > 80 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX > 0 && viewMode === 'gallery') {
        setViewMode('shorts');
      }
    }
  };

  return (
    <PageTransition variant="fade">
      <AnimatePresence>
        {showSplash && <SplashScreen />}
      </AnimatePresence>

      <div
        ref={contentRef}
        className="pt-[135px] min-h-screen bg-background overflow-y-auto will-change-scroll"
        style={{ transform: 'translateZ(0)' }}
        onTouchStart={viewMode === 'gallery' ? handleTouchStart : undefined}
        onTouchMove={viewMode === 'gallery' ? handleTouchMove : undefined}
        onTouchEnd={viewMode === 'gallery' ? handleTouchEnd : undefined}
      >
      <header
        className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur will-change-transform"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) - 8px)', transform: 'translateZ(0)' }}
      >
        <div className="container py-2">
          <div className="flex items-center justify-end h-h-auto">
            
            <UserMenu />
          </div>
          
          <div className="flex items-center gap-2 mt-1 mb-2">
            <button
              onClick={() => {
                setViewMode('gallery');
                setCurrentTags('');
              }}
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
      
{connectionError ? (
        <ConnectionError onRetry={handleRetry} isRetrying={isRetrying} />
      ) : viewMode === 'gallery' ? (
        <main className="ppy-0">
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

      
        
<PostViewer         post={selectedPost}
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
    </PageTransition>
  );
}
