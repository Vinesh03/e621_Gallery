import { useState, useEffect, useCallback } from 'react';
import { E621Post } from '@/types/e621';
import { e621Api } from '@/services/e621Api';
import { useSettingsStore, useSearchStore } from '@/stores/appStore';
import { PostGrid } from '@/components/gallery/PostGrid';
import { PostViewer } from '@/components/gallery/PostViewer';
import { SearchBar } from '@/components/gallery/SearchBar';
import { FilterSheet } from '@/components/gallery/FilterSheet';
import { toast } from 'sonner';

export default function GalleryPage() {
  const [posts, setPosts] = useState<E621Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPost, setSelectedPost] = useState<E621Post | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const { ratingFilter } = useSettingsStore();
  const { currentTags, setCurrentTags } = useSearchStore();

  const fetchPosts = useCallback(async (searchTags: string, pageNum: number, append = false) => {
    setIsLoading(true);
    try {
      const newPosts = await e621Api.searchPosts({
        tags: searchTags,
        limit: 40,
        page: pageNum,
        rating: ratingFilter,
      });
      
      if (append) {
        setPosts(prev => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }
      setHasMore(newPosts.length === 40);
    } catch (error) {
      toast.error('Failed to load posts');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [ratingFilter]);

  useEffect(() => {
    setPage(1);
    fetchPosts(currentTags, 1, false);
  }, [currentTags, ratingFilter, fetchPosts]);

  const handleSearch = (tags: string) => {
    setCurrentTags(tags);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(currentTags, nextPage, true);
  };

  const handleDownload = async (post: E621Post) => {
    const url = e621Api.getDownloadUrl(post);
    if (!url) {
      toast.error('Download not available');
      return;
    }
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `e621_${post.id}.${post.file.ext}`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('Download started');
    } catch {
      toast.error('Download failed');
    }
  };

  const openViewer = (post: E621Post) => {
    const index = posts.findIndex(p => p.id === post.id);
    setSelectedPost(post);
    setSelectedIndex(index);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="container py-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <SearchBar onSearch={handleSearch} />
            </div>
            <FilterSheet />
          </div>
        </div>
      </header>

      {/* Content */}
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

      {/* Post Viewer */}
      <PostViewer
        post={selectedPost}
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
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
