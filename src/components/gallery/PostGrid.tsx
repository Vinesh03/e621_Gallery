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
            key={post.id}
            post={post}
            index={index}
            onClick={() => onPostClick(post)}
            onDownload={() => onDownload(post)}
          />
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && hasMore && onLoadMore && (
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
