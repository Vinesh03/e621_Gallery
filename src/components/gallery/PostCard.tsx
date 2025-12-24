import { E621Post } from '@/types/e621';
import { cn } from '@/lib/utils';
import { Play, Download, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

interface PostCardProps {
  post: E621Post;
  onClick: () => void;
  onDownload?: () => void;
  index?: number;
}

const ratingColors = {
  s: 'bg-safe',
  q: 'bg-questionable',
  e: 'bg-explicit',
};

const ratingLabels = {
  s: 'Safe',
  q: 'Quest.',
  e: 'Explicit',
};

export function PostCard({ post, onClick, onDownload, index = 0 }: PostCardProps) {
  const isVideo = post.file.ext === 'webm' || post.file.ext === 'mp4';
  const isGif = post.file.ext === 'gif';
  const previewUrl = post.preview.url || post.sample.url;
  const aspectRatio = post.file.height / post.file.width;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDownload?.();
  };

  if (!previewUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="masonry-item"
      >
        <div 
          className="relative rounded-lg bg-muted flex items-center justify-center cursor-pointer overflow-hidden"
          style={{ paddingBottom: `${Math.min(aspectRatio * 100, 200)}%` }}
          onClick={onClick}
        >
          <span className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            No Preview
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className="masonry-item"
    >
      <div 
        className="relative group rounded-lg overflow-hidden bg-muted cursor-pointer shadow-sm hover:shadow-lg transition-shadow"
        onClick={onClick}
      >
        <img
          src={previewUrl}
          alt={`Post ${post.id}`}
          className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Rating badge */}
        <div className={cn(
          "absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium text-primary-foreground",
          ratingColors[post.rating]
        )}>
          {ratingLabels[post.rating]}
        </div>

        {/* Video/GIF indicator */}
        {(isVideo || isGif) && (
          <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1.5">
            {isVideo ? (
              <Play className="w-3 h-3 fill-current" />
            ) : (
              <span className="text-xs font-bold px-1">GIF</span>
            )}
          </div>
        )}

        {/* Bottom info bar */}
        <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-foreground">
                <Heart className={cn("w-3 h-3", post.is_favorited && "fill-destructive text-destructive")} />
                {post.fav_count}
              </span>
              <span className="text-muted-foreground">
                {post.score.total >= 0 ? '+' : ''}{post.score.total}
              </span>
            </div>
            
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Download className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
