import { E621Post } from '@/types/e621';
import { e621Api } from '@/services/e621Api';
import { ChevronUp, ChevronDown, Heart, Download, X, ExternalLink, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ShortsViewerProps {
  posts: E621Post[];
  isLoading: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
  onExit: () => void;
}

export function ShortsViewer({ posts, isLoading, onLoadMore, hasMore, onExit }: ShortsViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'up' | 'down'>('down');
  const [isMuted, setIsMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentPost = posts[currentIndex];

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setDirection('up');
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < posts.length - 1) {
      setDirection('down');
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, posts.length]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') {
        goToPrevious();
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        goToNext();
      } else if (e.key === 'Escape') {
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext, onExit]);

  // Load more when near the end
  useEffect(() => {
    if (currentIndex >= posts.length - 3 && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [currentIndex, posts.length, hasMore, isLoading, onLoadMore]);

  // Play video when it changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch(() => {});
    }
  }, [currentIndex, isMuted]);

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

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  // Handle touch swipe
  const touchStartY = useRef<number>(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }
  };

  // Animation variants based on direction
  const slideVariants = {
    enter: (dir: 'up' | 'down') => ({
      opacity: 0,
      y: dir === 'down' ? 100 : -100,
    }),
    center: {
      opacity: 1,
      y: 0,
    },
    exit: (dir: 'up' | 'down') => ({
      opacity: 0,
      y: dir === 'down' ? -100 : 100,
    }),
  };

  if (posts.length === 0) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Nessun video trovato</p>
          <button onClick={onExit} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg">
            Torna alla galleria
          </button>
        </div>
      </div>
    );
  }

  const videoUrl = currentPost?.file?.url || currentPost?.sample?.url;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-background z-50 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Exit button */}
      <button
        onClick={onExit}
        className="absolute top-4 left-4 z-50 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation buttons */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
        <button
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className={cn(
            "p-3 rounded-full bg-background/80 hover:bg-background transition-colors",
            currentIndex === 0 && "opacity-50 cursor-not-allowed"
          )}
        >
          <ChevronUp className="w-6 h-6" />
        </button>
        <button
          onClick={goToNext}
          disabled={currentIndex === posts.length - 1 && !hasMore}
          className={cn(
            "p-3 rounded-full bg-background/80 hover:bg-background transition-colors",
            currentIndex === posts.length - 1 && !hasMore && "opacity-50 cursor-not-allowed"
          )}
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </div>

      {/* Action buttons */}
      <div className="absolute right-4 bottom-20 z-40 flex flex-col gap-4">
        <button
          onClick={toggleMute}
          className="p-3 rounded-full bg-background/80 hover:bg-background transition-colors"
          title={isMuted ? "Attiva audio" : "Disattiva audio"}
        >
          {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </button>
        <button
          className="p-3 rounded-full bg-background/80 hover:bg-background transition-colors flex flex-col items-center"
        >
          <Heart className={cn("w-6 h-6", currentPost?.is_favorited && "fill-destructive text-destructive")} />
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

      {/* Progress indicator */}
      <div className="absolute top-4 right-1/2 translate-x-1/2 z-40 px-3 py-1 rounded-full bg-background/80 text-sm">
        {currentIndex + 1} / {posts.length}
      </div>

      {/* Video container */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentPost?.id}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full h-full flex items-center justify-center"
        >
          {currentPost && videoUrl ? (
            <div className="flex flex-col items-center gap-4 w-full h-full justify-center px-4">
              <video
                ref={videoRef}
                key={`video-${currentPost.id}`}
                src={videoUrl}
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
                controls
                autoPlay
                loop
                playsInline
                muted={isMuted}
                crossOrigin="anonymous"
                onError={(e) => {
                  // Video failed to load - this is expected due to CORS
                  console.log('Video error, CORS issue expected');
                }}
              />
              <p className="text-xs text-muted-foreground text-center max-w-md">
                Se il video non si carica, aprilo su e621
              </p>
              <button
                onClick={handleOpenOnE621}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Apri su e621</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="text-muted-foreground">Video non disponibile</p>
              <button
                onClick={handleOpenOnE621}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Apri su e621</span>
              </button>
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
  );
}
