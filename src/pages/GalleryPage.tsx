import { useState, useEffect, useCallback } from 'react';
import { E621Post } from '@/types/e621';
import { e621Api } from '@/services/e621Api';
import { useSettingsStore, useSearchStore, useAuthStore } from '@/stores/appStore';
import { PostGrid } from '@/components/gallery/PostGrid';
import { PostViewer } from '@/components/gallery/PostViewer';
import { SearchBar } from '@/components/gallery/SearchBar';
import { FilterSheet } from '@/components/gallery/FilterSheet';
import { ShortsViewer } from '@/components/gallery/ShortsViewer';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LayoutGrid, Play } from 'lucide-react';
import { UserMenu } from '@/components/gallery/UserMenu';

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
  const [page, setPage] = useState(1);
  const [shortsPage, setShortsPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [hasMoreShorts, setHasMoreShorts] = useState(true);
  const [selectedPost, setSelectedPost] = useState<E621Post | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const { ratingFilter, mediaFilter, viewMode, setViewMode } = useSettingsStore();
  const { currentTags, setCurrentTags } = useSearchStore();
  const { credentials, isGuest, isFirstLogin, setNotFirstLogin } = useAuthStore();

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

  const fetchPosts = useCallback(async (searchTags: string, pageNum: number, append = false) => {
    setIsLoading(true);
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
      }
      setHasMore(newPosts.length === 40);
    } catch (error) {
      toast.error('Impossibile caricare i post');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [ratingFilter, mediaFilter]);

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

  useEffect(() => {
    if (viewMode === 'gallery') {
      setPage(1);
      fetchPosts(currentTags, 1, false);
    } else {
      setShortsPage(1);
      fetchShortsPosts(currentTags, 1, false);
    }
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

  const displayName = credentials?.username || (isGuest ? 'Ospite' : null);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header
        className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border"
      >
        <div className="container py-3">
          {/* User menu */}
          <div className="flex items-center justify-end mb-2">
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
      {viewMode === 'gallery' ? (
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
  );
}
