import { E621Post } from '@/types/e621';
import { e621Api } from '@/services/e621Api';
import { Star, Download, ExternalLink, Loader2, ThumbsUp, ThumbsDown, LayoutGrid, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuthStore, useSettingsStore } from '@/stores/appStore';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface ShortsViewerProps {
  posts: E621Post[];
  isLoading: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
  onExit: () => void;
}

// Number of videos to preload ahead
const PRELOAD_COUNT = 3;

export function ShortsViewer({ posts, isLoading, onLoadMore, hasMore, onExit }: ShortsViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'up' | 'down'>('down');
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDisliking, setIsDisliking] = useState(false);
  const [localPosts, setLocalPosts] = useState<E621Post[]>(posts);
  // Track user votes per post: postId -> vote (1, -1, or 0)
  const [userVotes, setUserVotes] = useState<Map<number, 1 | -1 | 0>>(new Map());
  // Track user favorites per post
  const [userFavorites, setUserFavorites] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const preloadedUrls = useRef<Set<string>>(new Set());
  
  const { isGuest, logout } = useAuthStore();
  const { viewMode, setViewMode } = useSettingsStore();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Sync local posts with prop
  useEffect(() => {
    setLocalPosts(posts);
  }, [posts]);

  const currentPost = localPosts[currentIndex];

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setDirection('up');
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < localPosts.length - 1) {
      setDirection('down');
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, localPosts.length]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') {
        goToPrevious();
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        goToNext();
      } else if (e.key === 'Escape') {
        handleExitToGallery();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext, onExit]);

  // Load more when near the end
  useEffect(() => {
    if (currentIndex >= localPosts.length - 3 && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [currentIndex, localPosts.length, hasMore, isLoading, onLoadMore]);

  // Preload upcoming videos
  useEffect(() => {
    const preloadVideos = () => {
      for (let i = 1; i <= PRELOAD_COUNT; i++) {
        const nextIndex = currentIndex + i;
        if (nextIndex < localPosts.length) {
          const nextPost = localPosts[nextIndex];
          const videoUrl = e621Api.getVideoPlaybackUrl(nextPost) || e621Api.getDownloadUrl(nextPost);
          
          if (videoUrl && !preloadedUrls.current.has(videoUrl)) {
            // Create a hidden video element to preload
            const preloadVideo = document.createElement('video');
            preloadVideo.preload = 'metadata';
            preloadVideo.src = videoUrl;
            preloadVideo.muted = true;
            preloadedUrls.current.add(videoUrl);
          }
        }
      }
    };

    preloadVideos();
  }, [currentIndex, localPosts]);

  // Pause videos that are not visible
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (index === currentIndex) {
        video.muted = true; // Start muted to allow autoplay
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [currentIndex]);

  const handleLike = async () => {
    if (isGuest) {
      setShowLoginDialog(true);
      return;
    }
    
    if (!currentPost) return;
    
    setIsLiking(true);
    try {
      // e621 API: sending score=1 toggles like on/off
      const result = await e621Api.votePost(currentPost.id, 1);
      
      setLocalPosts(prev => prev.map((p, i) => 
        i === currentIndex ? { ...p, score: { up: result.up, down: result.down, total: result.score } } : p
      ));
      setUserVotes(prev => new Map(prev).set(currentPost.id, result.our_score as 1 | -1 | 0));
      toast.success(result.our_score === 1 ? 'Like aggiunto!' : 'Like rimosso');
    } catch (error) {
      toast.error('Errore nel mettere like');
      console.error(error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDislike = async () => {
    if (isGuest) {
      setShowLoginDialog(true);
      return;
    }
    
    if (!currentPost) return;
    
    setIsDisliking(true);
    try {
      // e621 API: sending score=-1 toggles dislike on/off
      const result = await e621Api.votePost(currentPost.id, -1);
      
      setLocalPosts(prev => prev.map((p, i) => 
        i === currentIndex ? { ...p, score: { up: result.up, down: result.down, total: result.score } } : p
      ));
      setUserVotes(prev => new Map(prev).set(currentPost.id, result.our_score as 1 | -1 | 0));
      toast.success(result.our_score === -1 ? 'Dislike aggiunto!' : 'Dislike rimosso');
    } catch (error) {
      toast.error('Errore nel mettere dislike');
      console.error(error);
    } finally {
      setIsDisliking(false);
    }
  };

  const handleFavorite = async () => {
    if (isGuest) {
      setShowLoginDialog(true);
      return;
    }
    
    if (!currentPost) return;
    
    setIsFavoriting(true);
    try {
      const isFav = userFavorites.has(currentPost.id) || currentPost.is_favorited;
      if (isFav) {
        await e621Api.removeFavorite(currentPost.id);
        setUserFavorites(prev => {
          const next = new Set(prev);
          next.delete(currentPost.id);
          return next;
        });
        setLocalPosts(prev => prev.map((p, i) => 
          i === currentIndex ? { ...p, is_favorited: false, fav_count: p.fav_count - 1 } : p
        ));
        toast.success('Rimosso dai preferiti');
      } else {
        await e621Api.addFavorite(currentPost.id);
        setUserFavorites(prev => new Set(prev).add(currentPost.id));
        setLocalPosts(prev => prev.map((p, i) => 
          i === currentIndex ? { ...p, is_favorited: true, fav_count: p.fav_count + 1 } : p
        ));
        toast.success('Aggiunto ai preferiti!');
      }
    } catch (error) {
      toast.error('Errore nella gestione preferiti');
      console.error(error);
    } finally {
      setIsFavoriting(false);
    }
  };

  // Handle exit with browser history support
  const handleExitToGallery = () => {
    setViewMode('gallery');
    onExit();
  };

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      handleExitToGallery();
    };

    // Push a new state when entering shorts
    window.history.pushState({ shorts: true }, '');
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleLoginRedirect = () => {
    logout();
    navigate('/login');
  };

  const handleDownload = () => {
    if (!currentPost) return;
    
    const url = e621Api.getDownloadUrl(currentPost);
    if (!url) {
      toast.error('Download non disponibile');
      return;
    }

    window.open(url, '_blank');
    toast.success('Download aperto in nuova scheda');
  };

  const handleOpenOnE621 = () => {
    if (!currentPost) return;
    window.open(`https://e621.net/posts/${currentPost.id}`, '_blank');
  };

  // Handle touch swipe (vertical for navigation, horizontal for view mode)
  const touchStartY = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    const diffY = touchStartY.current - touchEndY;
    const diffX = touchStartX.current - touchEndX;
    
    // Horizontal swipe to change view mode (swipe right = go to gallery)
    if (Math.abs(diffX) > 80 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX < 0) {
        // Swipe right -> go to Gallery
        handleExitToGallery();
        return;
      }
    }
    
    // Vertical swipe for video navigation
    if (Math.abs(diffY) > 50 && Math.abs(diffY) > Math.abs(diffX)) {
      if (diffY > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }
  };

  const currentIsFavorited = currentPost ? (userFavorites.has(currentPost.id) || currentPost.is_favorited) : false;

  // Show loading state instead of "no videos" when initially loading
  if (localPosts.length === 0 && isLoading) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        {/* Gallery button even during loading */}
        <button
          onClick={handleExitToGallery}
          className="absolute top-4 left-4 z-50 px-4 py-2 rounded-full bg-background/80 hover:bg-background transition-colors flex items-center gap-2"
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-sm font-medium">Galleria</span>
        </button>
        <div className="text-center flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Caricamento video...</p>
        </div>
      </div>
    );
  }

  if (localPosts.length === 0) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        {/* Gallery button */}
        <button
          onClick={handleExitToGallery}
          className="absolute top-4 left-4 z-50 px-4 py-2 rounded-full bg-background/80 hover:bg-background transition-colors flex items-center gap-2"
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-sm font-medium">Galleria</span>
        </button>
        <div className="text-center">
          <p className="text-muted-foreground">Nessun video trovato</p>
          <button onClick={handleExitToGallery} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg">
            Torna alla galleria
          </button>
        </div>
      </div>
    );
  }

  const currentVote = currentPost ? (userVotes.get(currentPost.id) || 0) : 0;

  return (
    <>
      <div 
        ref={containerRef}
        className="fixed inset-0 bg-background z-50 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* View mode toggle - same as GalleryPage */}
        <div className="absolute top-4 left-4 right-4 z-50 flex items-center gap-2">
          <button
            onClick={handleExitToGallery}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-colors bg-secondary hover:bg-secondary/80"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="font-medium text-sm">Galleria</span>
          </button>
          <button
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-colors bg-primary text-primary-foreground"
            )}
          >
            <Play className="w-4 h-4" />
            <span className="font-medium text-sm">Shorts</span>
          </button>
        </div>

        {/* Navigation buttons - only show on desktop */}
        {!isMobile && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
            <button
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className={cn(
                "p-3 rounded-full bg-background/80 hover:bg-background transition-colors text-sm font-medium",
                currentIndex === 0 && "opacity-50 cursor-not-allowed"
              )}
            >
              ↑ Precedente
            </button>
            <button
              onClick={goToNext}
              disabled={currentIndex === localPosts.length - 1 && !hasMore}
              className={cn(
                "p-3 rounded-full bg-background/80 hover:bg-background transition-colors text-sm font-medium",
                currentIndex === localPosts.length - 1 && !hasMore && "opacity-50 cursor-not-allowed"
              )}
            >
              ↓ Successivo
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className="absolute right-4 bottom-20 z-40 flex flex-col gap-4">
          <button
            onClick={handleLike}
            disabled={isLiking}
            className="p-3 rounded-full bg-background/80 hover:bg-background transition-colors flex flex-col items-center"
          >
            {isLiking ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <ThumbsUp className={cn("w-6 h-6", currentVote === 1 && "fill-primary text-primary")} />
            )}
            <span className="text-xs mt-1">{currentPost?.score.up || 0}</span>
          </button>
          <button
            onClick={handleDislike}
            disabled={isDisliking}
            className="p-3 rounded-full bg-background/80 hover:bg-background transition-colors flex flex-col items-center"
          >
            {isDisliking ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <ThumbsDown className={cn("w-6 h-6", currentVote === -1 && "fill-destructive text-destructive")} />
            )}
            <span className="text-xs mt-1">{currentPost?.score.down || 0}</span>
          </button>
          <button
            onClick={handleFavorite}
            disabled={isFavoriting}
            className="p-3 rounded-full bg-background/80 hover:bg-background transition-colors flex flex-col items-center"
          >
            {isFavoriting ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Star className={cn("w-6 h-6", currentIsFavorited && "fill-primary text-primary")} />
            )}
            <span className="text-xs mt-1">{currentPost?.fav_count || 0}</span>
          </button>
          <button
            onClick={handleOpenOnE621}
            className="p-3 rounded-full bg-background/80 hover:bg-background transition-colors"
            title="Apri su e621"
          >
            <ExternalLink className="w-6 h-6" />
          </button>
          <button
            onClick={handleDownload}
            className="p-3 rounded-full bg-background/80 hover:bg-background transition-colors"
          >
            <Download className="w-6 h-6" />
          </button>
        </div>

        {/* Video container */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentPost?.id}
            initial={{ opacity: 0, y: direction === 'down' ? 100 : -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: direction === 'down' ? -100 : 100 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full h-full flex items-center justify-center"
          >
            {currentPost && (
              <div className="flex flex-col items-center gap-4 w-full h-full justify-center">
                <video
                  ref={(el) => {
                    if (el) videoRefs.current.set(currentIndex, el);
                  }}
                  src={e621Api.getVideoPlaybackUrl(currentPost) || e621Api.getDownloadUrl(currentPost) || ''}
                  className="max-w-full max-h-[80vh] object-contain"
                  controls
                  autoPlay
                  loop
                  playsInline
                  muted
                  preload="auto"
                  onError={() => {
                    toast.error('Video non riproducibile');
                  }}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-background/80 text-sm">
            Caricamento...
          </div>
        )}
      </div>

      {/* Login Required Dialog */}
      <AlertDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex justify-between items-start">
              <AlertDialogTitle>Accesso richiesto</AlertDialogTitle>
              <button
                onClick={() => setShowLoginDialog(false)}
                className="p-1 rounded-full hover:bg-secondary transition-colors"
              >
                ✕
              </button>
            </div>
            <AlertDialogDescription>
              Per utilizzare questa funzione devi accedere con il tuo account e621.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowLoginDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleLoginRedirect}>
              Accedi
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}