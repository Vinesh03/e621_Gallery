import { E621Post } from '@/types/e621';
import { e621Api } from '@/services/e621Api';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, Download, Heart, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';

interface PostViewerProps {
  post: E621Post | null;
  isOpen: boolean;
  onClose: () => void;
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

  if (!post) return null;

  const isVideo = post.file.ext === 'webm' || post.file.ext === 'mp4';
  const mediaUrl = e621Api.getSampleUrl(post) || e621Api.getDownloadUrl(post);
  const downloadUrl = e621Api.getDownloadUrl(post);

  const handleDownload = async () => {
    if (!downloadUrl) {
      toast.error('Download not available');
      return;
    }

    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `e621_${post.id}.${post.file.ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download');
      console.error('Download error:', error);
    }
  };

  const allTags = [
    ...post.tags.artist.map(t => ({ tag: t, type: 'artist' })),
    ...post.tags.character.map(t => ({ tag: t, type: 'character' })),
    ...post.tags.copyright.map(t => ({ tag: t, type: 'copyright' })),
    ...post.tags.species.map(t => ({ tag: t, type: 'species' })),
    ...post.tags.general.map(t => ({ tag: t, type: 'general' })),
  ];

  const tagColors: Record<string, string> = {
    artist: 'text-primary',
    character: 'text-accent',
    copyright: 'text-destructive',
    species: 'text-success',
    general: 'text-foreground',
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent hideCloseButton className="max-w-[95vw] max-h-[95vh] p-0 gap-0 bg-background/95 backdrop-blur-lg border-border overflow-hidden">
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
                onClick={onClose}
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
                    <video
                      src={mediaUrl || ''}
                      controls
                      autoPlay
                      loop
                      className="max-w-full max-h-[70vh] rounded-lg"
                    />
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
                  animate={{ width: 280, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="border-l border-border bg-card overflow-hidden"
                >
                  <div className="w-[280px] h-full overflow-y-auto p-4 space-y-4">
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
                      <h3 className="font-semibold text-sm">Tags</h3>
                      <div className="flex flex-wrap gap-1">
                        {allTags.slice(0, 30).map(({ tag, type }) => (
                          <span
                            key={`${type}-${tag}`}
                            className={cn(
                              "text-xs px-1.5 py-0.5 rounded bg-secondary",
                              tagColors[type]
                            )}
                          >
                            {tag}
                          </span>
                        ))}
                        {allTags.length > 30 && (
                          <span className="text-xs text-muted-foreground">
                            +{allTags.length - 30} more
                          </span>
                        )}
                      </div>
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
