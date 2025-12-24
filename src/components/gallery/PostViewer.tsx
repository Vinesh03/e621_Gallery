import { E621Post } from '@/types/e621';
import { e621Api } from '@/services/e621Api';
import { useSearchStore } from '@/stores/appStore';
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog';
import { X, Download, Heart, ExternalLink, ChevronLeft, ChevronRight, Plus, Minus, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

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
  
  const { currentTags, setCurrentTags } = useSearchStore();

  // Reset state when post changes
  useEffect(() => {
    setShowAllTags(false);
    setPendingTagChanges(new Set());
  }, [post?.id]);

  if (!post) return null;

  const isVideo = post.file.ext === 'webm' || post.file.ext === 'mp4';
  const mediaUrl = e621Api.getSampleUrl(post) || e621Api.getDownloadUrl(post);
  const downloadUrl = e621Api.getDownloadUrl(post);
  const e621Url = `https://e621.net/posts/${post.id}`;

  const handleDownload = async () => {
    if (!downloadUrl) {
      toast.error('Download non disponibile');
      return;
    }

    // Open in new tab as fallback for CORS issues
    window.open(downloadUrl, '_blank');
    toast.success('Download aperto in nuova scheda');
  };

  const handleOpenOnE621 = () => {
    window.open(e621Url, '_blank');
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
      // Remove exclusion
      newTags = tags.filter(t => t !== `-${tag}`);
    } else if (isTagInSearch(tag)) {
      // Change from include to exclude
      newTags = tags.filter(t => t !== tag);
      newTags.push(`-${tag}`);
    } else {
      // Add tag
      newTags.push(tag);
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

  const allTags = [
    ...post.tags.artist.map(t => ({ tag: t, type: 'artist' })),
    ...post.tags.character.map(t => ({ tag: t, type: 'character' })),
    ...post.tags.copyright.map(t => ({ tag: t, type: 'copyright' })),
    ...post.tags.species.map(t => ({ tag: t, type: 'species' })),
    ...post.tags.general.map(t => ({ tag: t, type: 'general' })),
    ...post.tags.meta.map(t => ({ tag: t, type: 'meta' })),
    ...post.tags.lore.map(t => ({ tag: t, type: 'lore' })),
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent hideCloseButton className="max-w-[95vw] max-h-[95vh] p-0 gap-0 bg-background/95 backdrop-blur-lg border-border overflow-hidden">
        <DialogDescription className="sr-only">Visualizzatore post {post.id}</DialogDescription>
        <div className="relative flex flex-col h-[95vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border bg-background/80">
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-muted-foreground">#{post.id}</span>
              <span className={cn("text-sm font-medium", ratingColors[post.rating])}>
                {ratingLabels[post.rating]}
              </span>
            </div>
            <div className="flex items-center gap-2">
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
                onClick={handleDownload}
                className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Media */}
            <div className="flex-1 relative flex items-center justify-center bg-background p-4">
              {/* Navigation buttons */}
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

              <AnimatePresence mode="wait">
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="max-w-full max-h-full"
                >
                  {isVideo ? (
                    <div className="flex flex-col items-center gap-4">
                      {/* Try to play video, show fallback if it fails */}
                      <video
                        src={mediaUrl || ''}
                        controls
                        autoPlay
                        loop
                        playsInline
                        muted
                        className="max-w-full max-h-[60vh] rounded-lg"
                        onError={() => {
                          toast.error('Video non riproducibile, apri su e621');
                        }}
                      />
                      <button
                        onClick={handleOpenOnE621}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        <span>Apri video su e621</span>
                      </button>
                    </div>
                  ) : (
                    <img
                      src={mediaUrl || ''}
                      alt={`Post ${post.id}`}
                      className="max-w-full max-h-[70vh] object-contain rounded-lg"
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Info sidebar */}
            <AnimatePresence>
              {showInfo && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 320, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="border-l border-border bg-card overflow-hidden"
                >
                  <div className="w-[320px] h-full overflow-y-auto p-4 space-y-4">
                    {/* Stats */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm">Stats</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Heart className={cn("w-4 h-4", post.is_favorited && "fill-destructive text-destructive")} />
                          <span>{post.fav_count}</span>
                        </div>
                        <div>Score: {post.score.total}</div>
                        <div className="col-span-2 text-muted-foreground">
                          {post.file.width} × {post.file.height}
                        </div>
                      </div>
                    </div>

                    {/* Sources */}
                    {post.sources.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm">Sources</h3>
                        <div className="space-y-1">
                          {post.sources.slice(0, 3).map((source, i) => (
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

                    {/* Tags */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">Tags ({allTags.length})</h3>
                        <p className="text-xs text-muted-foreground">
                          Clicca per aggiungere/rimuovere
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

                    {/* Description */}
                    {post.description && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm">Description</h3>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                          {post.description}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
