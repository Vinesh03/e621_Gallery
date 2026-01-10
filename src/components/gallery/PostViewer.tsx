import { E621Post } from '@/types/e621';
import { e621Api } from '@/services/e621Api';
import { useSearchStore, useAuthStore, useUserInteractionsStore, useSettingsStore } from '@/stores/appStore';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ExternalLink, ChevronLeft, ChevronRight, Plus, Minus, ChevronDown, ChevronUp, Play, ThumbsUp, ThumbsDown, MessageCircle, Star, Loader2, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { CommentsSheet } from './CommentsSheet';
import { FilterSheet } from './FilterSheet';
import { downloadService } from '@/services/downloadService';
import { shareService } from '@/services/shareService';

interface PostViewerProps {
  post: E621Post | null;
  isOpen: boolean;
  onClose: (triggerSearch?: boolean) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

const ratingColors = {
  s: 'text-safe',
  q: 'text-questionable',
  e: 'text-explicit',
};

const ratingLabels = {
  s: 'Safe',
  q: 'Questionable',
  e: 'Explicit',
};

const tagColors: Record<string, string> = {
  artist: 'text-primary',
  character: 'text-accent',
  copyright: 'text-destructive',
  species: 'text-success',
  general: 'text-foreground',
  meta: 'text-muted-foreground',
  lore: 'text-warning',
};

export function PostViewer({ 
  post, 
  isOpen, 
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext 
}: PostViewerProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [pendingTagChanges, setPendingTagChanges] = useState<Set<string>>(new Set());
  const [mobileInfoExpanded, setMobileInfoExpanded] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDisliking, setIsDisliking] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [localPost, setLocalPost] = useState<E621Post | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [showFiltersSheet, setShowFiltersSheet] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const infoScrollRef = useRef<HTMLDivElement>(null);
  const infoSwipeRef = useRef<{
    startX: number;
    startY: number;
    axis: 'none' | 'x' | 'y';
    startScrollTop: number;
    triggered: boolean;
  } | null>(null);
  const navigate = useNavigate();

  const startInfoSwipe = (x: number, y: number, scrollTop: number) => {
    infoSwipeRef.current = {
      startX: x,
      startY: y,
      axis: 'none',
      startScrollTop: scrollTop,
      triggered: false,
    };
  };

  const handleInfoSwipeMove = (dx: number, dy: number, scrollTop: number) => {
    const s = infoSwipeRef.current;
    if (!s || s.triggered) return;

    const atTop = scrollTop <= 0 && s.startScrollTop <= 0;

    if (s.axis === 'none') {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;

      if (atTop && dy > 0 && Math.abs(dy) >= Math.abs(dx) * 0.8) {
        s.axis = 'y';
      } else {
        s.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
    }

    if (s.axis === 'y') {
      if (atTop && dy > 60) {
        s.triggered = true;
        setMobileInfoExpanded(false);
      }
      return;
    }

    if (Math.abs(dx) > 90 && Math.abs(dy) < 60) {
      s.triggered = true;
      if (dx < 0 && hasNext && onNext) {
        onNext();
      } else if (dx > 0 && hasPrevious && onPrevious) {
        onPrevious();
      }
    }
  };

  const endInfoSwipe = () => {
    infoSwipeRef.current = null;
  };
  
  const { currentTags, setCurrentTags } = useSearchStore();
  const { isGuest } = useAuthStore();
  const { getUserVote, setUserVote, isUserFavorite, setUserFavorite } = useUserInteractionsStore();
  const { downloadFolder } = useSettingsStore();

  const userVote = post ? getUserVote(post.id) : 0;
  const userFavorited = post ? isUserFavorite(post.id) : false;

  useEffect(() => {
    if (!post?.id || !isOpen) return;
    
    setLocalPost(post);
    
    const abortController = new AbortController();
    
    const fetchFreshStats = async () => {
      setIsLoadingStats(true);
      try {
        const freshPost = await e621Api.getPost(post.id);
        if (!abortController.signal.aborted) {
          setLocalPost(freshPost);
          if (freshPost.is_favorited) {
            setUserFavorite(post.id, true);
          }
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('Error fetching fresh post stats:', error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingStats(false);
        }
      }
    };
    
    fetchFreshStats();
    
    return () => {
      abortController.abort();
    };
  }, [post?.id, isOpen, setUserFavorite]);

  useEffect(() => {
    setShowAllTags(false);
    setPendingTagChanges(new Set());
    setMobileInfoExpanded(false);
    setShowComments(false);
    setShowVideo(false);
  }, [post?.id]);

  useEffect(() => {
    if (!isOpen) return;
    
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      handleClose();
    };

    window.history.pushState({ postViewer: true, postId: post?.id }, '');
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, post?.id]);

  // NO RENDERING IF NOT OPEN OR NO POST
  if (!isOpen || !localPost) return null;

  const isVideo = localPost.file.ext === 'webm' || localPost.file.ext === 'mp4';
  const mediaUrl = e621Api.getSampleUrl(localPost) || e621Api.getDownloadUrl(localPost);
  const downloadUrl = e621Api.getDownloadUrl(localPost);
  // Use sample URL for video playback - same as ShortsViewer
  const videoUrl = localPost.sample?.url || localPost.file.url;
  const e621Url = `https://e621.net/posts/${localPost.id}`;

  const handleDownload = async () => {
    if (!downloadUrl) {
      toast.error('Download non disponibile');
      return;
    }

    setIsDownloading(true);
    try {
      const result = await downloadService.downloadFile(downloadUrl, localPost.id, downloadFolder);
      if (result.success) {
        toast.success('Download completato!', {
          description: downloadFolder === 'e621_gallery' ? 'Salvato in e621_Gallery' : 'Salvato in Download',
        });
      } else {
        toast.error('Errore nel download', {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error('Errore nel download');
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const result = await shareService.sharePost(localPost.id);
      if (result.success) {
        toast.success('Link copiato!');
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Errore nella condivisione');
      console.error('Share error:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleOpenOnE621 = () => {
    window.open(e621Url, '_blank');
  };

  const handleLike = async () => {
    if (isGuest) {
      setShowLoginDialog(true);
      return;
    }
    
    setIsLiking(true);
    try {
      const result = await e621Api.votePost(localPost.id, 1);
      setLocalPost(prev => prev ? {
        ...prev,
        score: { up: result.up, down: result.down, total: result.score }
      } : null);
      setUserVote(localPost.id, result.our_score as 1 | -1 | 0);
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
    
    setIsDisliking(true);
    try {
      const result = await e621Api.votePost(localPost.id, -1);
      setLocalPost(prev => prev ? {
        ...prev,
        score: { up: result.up, down: result.down, total: result.score }
      } : null);
      setUserVote(localPost.id, result.our_score as 1 | -1 | 0);
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
    
    setIsFavoriting(true);
    try {
      const isFav = userFavorited || localPost.is_favorited;
      if (isFav) {
        await e621Api.removeFavorite(localPost.id);
        setLocalPost(prev => prev ? {
          ...prev,
          is_favorited: false,
          fav_count: prev.fav_count - 1
        } : null);
        setUserFavorite(localPost.id, false);
        toast.success('Rimosso dai preferiti');
      } else {
        await e621Api.addFavorite(localPost.id);
        setLocalPost(prev => prev ? {
          ...prev,
          is_favorited: true,
          fav_count: prev.fav_count + 1
        } : null);
        setUserFavorite(localPost.id, true);
        toast.success('Aggiunto ai preferiti!');
      }
    } catch (error) {
      toast.error('Errore nella gestione preferiti');
      console.error(error);
    } finally {
      setIsFavoriting(false);
    }
  };

  const getCurrentTags = (): string[] => {
    return currentTags.split(' ').filter(t => t.trim());
  };

  const isTagInSearch = (tag: string): boolean => {
    const tags = getCurrentTags();
    return tags.includes(tag) || tags.includes(`-${tag}`);
  };

  const isTagExcluded = (tag: string): boolean => {
    const tags = getCurrentTags();
    return tags.includes(`-${tag}`);
  };

  const handleTagToggle = (tag: string) => {
    const tags = getCurrentTags();
    let newTags: string[];

    if (isTagExcluded(tag)) {
      newTags = tags.filter(t => t !== `-${tag}`);
    } else if (isTagInSearch(tag)) {
      newTags = tags.filter(t => t !== tag);
    } else {
      newTags = [...tags, tag];
    }

    const newTagString = newTags.join(' ');
    setCurrentTags(newTagString);
    setPendingTagChanges(prev => new Set([...prev, tag]));
  };

  const handleClose = () => {
    const shouldTriggerSearch = pendingTagChanges.size > 0;
    onClose(shouldTriggerSearch);
  };

  const handlePlayVideo = () => {
    setShowVideo(true);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().catch(err => {
          console.warn('Autoplay blocked:', err);
        });
      }
    }, 100);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y < -50 && !mobileInfoExpanded) {
      setMobileInfoExpanded(true);
    }
    if (info.offset.y > 50) {
      if (mobileInfoExpanded) {
        setMobileInfoExpanded(false);
      } else {
        handleClose();
      }
    }
    if (Math.abs(info.offset.x) > 80 && Math.abs(info.offset.y) < 50) {
      if (info.offset.x < 0 && hasNext && onNext) {
        onNext();
      } else if (info.offset.x > 0 && hasPrevious && onPrevious) {
        onPrevious();
      }
    }
  };

  const allTags = [
    ...localPost.tags.artist.map(t => ({ tag: t, type: 'artist' })),
    ...localPost.tags.character.map(t => ({ tag: t, type: 'character' })),
    ...localPost.tags.copyright.map(t => ({ tag: t, type: 'copyright' })),
    ...localPost.tags.species.map(t => ({ tag: t, type: 'species' })),
    ...localPost.tags.general.map(t => ({ tag: t, type: 'general' })),
    ...localPost.tags.meta.map(t => ({ tag: t, type: 'meta' })),
    ...localPost.tags.lore.map(t => ({ tag: t, type: 'lore' })),
  ];

  const displayedTags = showAllTags ? allTags : allTags.slice(0, 30);
  const hiddenTagsCount = allTags.length - 30;

  const renderTag = ({ tag, type }: { tag: string; type: string }) => {
    const inSearch = isTagInSearch(tag);
    const excluded = isTagExcluded(tag);
    
    return (
      <button
        key={`${type}-${tag}`}
        onClick={() => handleTagToggle(tag)}
        className={cn(
          "text-xs px-2 py-1 rounded bg-secondary flex items-center gap-1 hover:bg-secondary/80 transition-colors group",
          tagColors[type],
          excluded && "opacity-50 line-through",
          inSearch && !excluded && "ring-1 ring-primary"
        )}
      >
        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
          {inSearch && !excluded ? (
            <Minus className="w-3 h-3" />
          ) : (
            <Plus className="w-3 h-3" />
          )}
        </span>
        <span>{tag}</span>
      </button>
    );
  };

  // Video player - NO ANIMATION WRAPPER to prevent Android crash
  const VideoPlayer = () => (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src={videoUrl || ''}
        className="w-full h-full object-contain"
        controls
        autoPlay
        muted
        loop
        playsInline
        onError={(e) => {
          console.error('[Video] Error playing:', e);
          toast.error('Errore nel caricamento video');
        }}
      />
    </div>
  );

  // Video thumbnail
  const VideoThumbnail = () => (
    <div
      className="relative cursor-pointer group"
      onClick={handlePlayVideo}
    >
      <img
        src={localPost.preview.url || localPost.sample?.url || ''}
        alt={`Video preview ${localPost.id}`}
        className="max-w-full max-h-full object-contain"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-background/30 group-hover:bg-background/50 transition-colors">
        <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
        </div>
      </div>
      <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-background/80 text-xs font-medium">
        {localPost.file.ext?.toUpperCase()} • {Math.round((localPost.file.size || 0) / 1024 / 1024 * 10) / 10}MB
      </div>
    </div>
  );

  // FULLSCREEN OVERLAY - NO DIALOG WRAPPER (same as Shorts approach)
  // This prevents Android WebView video crash in Modal context
  return (
    <>
      {/* Fullscreen overlay - directly mounted to body */}
      <div 
        className="fixed inset-0 z-50 bg-background"
        style={{
          paddingTop: isMobile ? 'max(env(safe-area-inset-top), var(--safe-area-inset-top, 0px))' : '0',
          paddingBottom: isMobile ? 'max(env(safe-area-inset-bottom), var(--safe-area-inset-bottom, 0px))' : '0',
        }}
      >
        {isMobile ? (
          // Mobile Layout
          <div ref={containerRef} className="relative flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-border bg-background/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-muted-foreground">#{localPost.id}</span>
                <span className={cn("text-sm font-medium", ratingColors[localPost.rating])}>
                  {ratingLabels[localPost.rating]}
                </span>
                {isLoadingStats && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                  title="Condividi"
                >
                  {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <motion.div 
              className="flex-1 flex flex-col overflow-hidden"
              drag="y"
              dragDirectionLock
              dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
            >
              {/* Video renders WITHOUT Dialog wrapper - same as Shorts */}
              <div
                className="relative flex items-center justify-center bg-background overflow-hidden"
                style={{ height: mobileInfoExpanded ? '40%' : '100%', transition: 'height 0.3s' }}
              >
                {hasPrevious && onPrevious && (
                  <button
                    onClick={onPrevious}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background transition-colors z-10"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}
                {hasNext && onNext && (
                  <button
                    onClick={onNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background transition-colors z-10"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}

                {isVideo ? (
                  showVideo ? <VideoPlayer /> : <VideoThumbnail />
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={localPost.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      src={mediaUrl || ''}
                      alt={`Post ${localPost.id}`}
                      className="max-w-full max-h-full object-contain"
                    />
                  </AnimatePresence>
                )}
              </div>

              <div className="flex justify-center py-2 bg-background">
                <div className="w-12 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              <div className="flex items-center justify-around p-3 border-t border-border bg-background">
                <button 
                  onClick={handleLike}
                  disabled={isLiking}
                  className="flex flex-col items-center gap-1 p-2"
                >
                  {isLiking ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ThumbsUp className={cn("w-5 h-5", userVote === 1 && "fill-primary text-primary")} />
                  )}
                  <span className="text-xs">{localPost.score.up}</span>
                </button>
                <button 
                  onClick={handleDislike}
                  disabled={isDisliking}
                  className="flex flex-col items-center gap-1 p-2"
                >
                  {isDisliking ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ThumbsDown className={cn("w-5 h-5", userVote === -1 && "fill-destructive text-destructive")} />
                  )}
                  <span className="text-xs">{localPost.score.down}</span>
                </button>
                <button 
                  onClick={handleFavorite}
                  disabled={isFavoriting}
                  className="flex flex-col items-center gap-1 p-2"
                >
                  {isFavoriting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Star className={cn("w-5 h-5", (userFavorited || localPost.is_favorited) && "fill-primary text-primary")} />
                  )}
                  <span className="text-xs">{localPost.fav_count}</span>
                </button>
                <button 
                  onClick={() => setShowComments(true)}
                  className="flex flex-col items-center gap-1 p-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-xs">{localPost.comment_count}</span>
                </button>
                <button
                  onClick={() => setMobileInfoExpanded(!mobileInfoExpanded)}
                  className="flex flex-col items-center gap-1 p-2"
                >
                  {mobileInfoExpanded ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronUp className="w-5 h-5" />
                  )}
                  <span className="text-xs">Info</span>
                </button>
              </div>

              <AnimatePresence>
                {mobileInfoExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden border-t border-border flex flex-col"
                  >
                    <div className="flex justify-center py-3 bg-card cursor-grab active:cursor-grabbing touch-none">
                      <div className="w-12 h-1 rounded-full bg-muted-foreground/50" />
                    </div>

                    <div
                      ref={infoScrollRef}
                      className="h-[40vh] overflow-y-auto p-4 space-y-4 bg-card"
                    >
                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm">Stats</h3>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Star className={cn("w-4 h-4", localPost.is_favorited && "fill-primary text-primary")} />
                            <span>{localPost.fav_count}</span>
                          </div>
                          <div>Score: {localPost.score.total}</div>
                          <div className="text-muted-foreground">
                            {localPost.file.width}×{localPost.file.height}
                          </div>
                        </div>
                      </div>

                      {localPost.sources.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="font-semibold text-sm">Sources</h3>
                          <div className="space-y-1">
                            {localPost.sources.slice(0, 3).map((source, i) => (
                              <a
                                key={i}
                                href={source}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-accent hover:underline truncate"
                              >
                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{source}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm">Tags ({allTags.length})</h3>
                          <p className="text-xs text-muted-foreground">
                            Tap per aggiungere/rimuovere
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {displayedTags.map(renderTag)}
                        </div>
                        {hiddenTagsCount > 0 && (
                          <button
                            onClick={() => setShowAllTags(!showAllTags)}
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            {showAllTags ? (
                              <>
                                <ChevronUp className="w-3 h-3" />
                                Mostra meno
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3" />
                                Mostra altri {hiddenTagsCount} tag
                              </>
                            )}
                          </button>
                        )}
                        
                        {pendingTagChanges.size > 0 && (
                          <p className="text-xs text-primary bg-primary/10 p-2 rounded">
                            {pendingTagChanges.size} tag modificati. La ricerca partirà alla chiusura.
                          </p>
                        )}
                      </div>

                      {localPost.description && (
                        <div className="space-y-2">
                          <h3 className="font-semibold text-sm">Description</h3>
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                            {localPost.description}
                          </p>
                        </div>
                      )}

                      <button
                        onClick={handleOpenOnE621}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Apri su e621</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        ) : (
          // Desktop Layout
          <div className="relative flex flex-col h-full">
            <div className="flex items-center justify-between p-3 border-b border-border bg-background/80">
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-muted-foreground">#{localPost.id}</span>
                <span className={cn("text-sm font-medium", ratingColors[localPost.rating])}>
                  {ratingLabels[localPost.rating]}
                </span>
                {isLoadingStats && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLike}
                  disabled={isLiking}
                  className={cn(
                    "p-2 rounded-lg hover:bg-secondary transition-colors flex items-center gap-1",
                    userVote === 1 && "bg-primary/10"
                  )}
                  title="Like"
                >
                  {isLiking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className={cn("w-4 h-4", userVote === 1 && "fill-primary text-primary")} />}
                  <span className="text-xs">{localPost.score.up}</span>
                </button>
                <button
                  onClick={handleDislike}
                  disabled={isDisliking}
                  className={cn(
                    "p-2 rounded-lg hover:bg-secondary transition-colors flex items-center gap-1",
                    userVote === -1 && "bg-destructive/10"
                  )}
                  title="Dislike"
                >
                  {isDisliking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className={cn("w-4 h-4", userVote === -1 && "fill-destructive text-destructive")} />}
                  <span className="text-xs">{localPost.score.down}</span>
                </button>
                <button
                  onClick={handleFavorite}
                  disabled={isFavoriting}
                  className={cn(
                    "p-2 rounded-lg hover:bg-secondary transition-colors flex items-center gap-1",
                    localPost.is_favorited && "bg-primary/10"
                  )}
                  title="Preferiti"
                >
                  {isFavoriting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Star className={cn("w-4 h-4", localPost.is_favorited && "fill-primary text-primary")} />
                  )}
                  <span className="text-xs">{localPost.fav_count}</span>
                </button>
                <button
                  onClick={() => setShowComments(true)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors flex items-center gap-1"
                  title="Commenti"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-xs">{localPost.comment_count}</span>
                </button>
                <button
                  onClick={handleOpenOnE621}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors text-sm flex items-center gap-1"
                  title="Apri su e621"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors text-sm"
                >
                  Info
                </button>
                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                  title="Condividi"
                >
                  {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 relative flex items-center justify-center bg-background p-4">
                {hasPrevious && onPrevious && (
                  <button
                    onClick={onPrevious}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background transition-colors z-10"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}
                {hasNext && onNext && (
                  <button
                    onClick={onNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background transition-colors z-10"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}

                {/* Video without Dialog wrapper, images with AnimatePresence */}
                {isVideo ? (
                  <div className="max-w-full max-h-full">
                    {showVideo ? <VideoPlayer /> : <VideoThumbnail />}
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={localPost.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      src={mediaUrl || ''}
                      alt={`Post ${localPost.id}`}
                      className="max-w-full max-h-[80vh] object-contain rounded-lg"
                    />
                  </AnimatePresence>
                )}
              </div>

              <AnimatePresence>
                {showInfo && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 350, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-l border-border bg-card overflow-hidden"
                  >
                    <div className="w-[350px] h-full overflow-y-auto p-4 space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold">Stats</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Star className={cn("w-4 h-4", localPost.is_favorited && "fill-primary text-primary")} />
                            <span>{localPost.fav_count} favorites</span>
                          </div>
                          <div>Score: {localPost.score.total}</div>
                          <div className="col-span-2 text-muted-foreground">
                            {localPost.file.width}×{localPost.file.height} • {localPost.file.ext?.toUpperCase()} • {Math.round((localPost.file.size || 0) / 1024)} KB
                          </div>
                        </div>
                      </div>

                      {localPost.sources.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="font-semibold">Sources</h3>
                          <div className="space-y-1">
                            {localPost.sources.map((source, i) => (
                              <a
                                key={i}
                                href={source}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-accent hover:underline truncate"
                              >
                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{source}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Tags ({allTags.length})</h3>
                          <p className="text-xs text-muted-foreground">
                            Click per aggiungere/rimuovere
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {displayedTags.map(renderTag)}
                        </div>
                        {hiddenTagsCount > 0 && (
                          <button
                            onClick={() => setShowAllTags(!showAllTags)}
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            {showAllTags ? (
                              <>
                                <ChevronUp className="w-3 h-3" />
                                Mostra meno
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3" />
                                Mostra altri {hiddenTagsCount} tag
                              </>
                            )}
                          </button>
                        )}
                        
                        {pendingTagChanges.size > 0 && (
                          <p className="text-xs text-primary bg-primary/10 p-2 rounded">
                            {pendingTagChanges.size} tag modificati. La ricerca partirà alla chiusura.
                          </p>
                        )}
                      </div>

                      {localPost.description && (
                        <div className="space-y-2">
                          <h3 className="font-semibold">Description</h3>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {localPost.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Separate AlertDialog for login - NOT inside main dialog */}
      <AlertDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accesso richiesto</AlertDialogTitle>
            <AlertDialogDescription>
              Per utilizzare questa funzione devi accedere con il tuo account e621.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowLoginDialog(false)}>
              <X className="w-4 h-4 mr-2" />
              Chiudi
            </Button>
            <Button onClick={() => {
              const { logout } = useAuthStore.getState();
              logout();
              navigate('/login');
            }}>
              Accedi
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CommentsSheet
        postId={localPost.id}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
      />

      <FilterSheet isOpen={showFiltersSheet} onOpenChange={setShowFiltersSheet} />
    </>
  );
}