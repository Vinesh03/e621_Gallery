import { useState, useEffect, useCallback } from 'react';
import { E621Post } from '@/types/e621';
import { e621Api } from '@/services/e621Api';
import { useAuthStore } from '@/stores/appStore';
import { PostGrid } from '@/components/gallery/PostGrid';
import { PostViewer } from '@/components/gallery/PostViewer';
import { toast } from 'sonner';
import { ArrowLeft, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<E621Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPost, setSelectedPost] = useState<E621Post | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const { credentials } = useAuthStore();
  const navigate = useNavigate();

  const fetchFavorites = useCallback(async (pageNum: number, append = false) => {
    if (!credentials?.username) return;
    
    setIsLoading(true);
    try {
      const posts = await e621Api.getFavorites(credentials.username, 40, pageNum);
      
      if (append) {
        setFavorites(prev => [...prev, ...posts]);
      } else {
        setFavorites(posts);
      }
      setHasMore(posts.length === 40);
    } catch (error) {
      toast.error('Impossibile caricare i preferiti');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [credentials?.username]);

  useEffect(() => {
    fetchFavorites(1, false);
  }, [fetchFavorites]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFavorites(nextPage, true);
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
    const index = favorites.findIndex(p => p.id === post.id);
    setSelectedPost(post);
    setSelectedIndex(index);
  };

  const handleCloseViewer = () => {
    setSelectedPost(null);
    setSelectedIndex(-1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="container py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/gallery')}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary fill-primary" />
              <h1 className="text-lg font-semibold">I miei preferiti</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="py-4">
        {favorites.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Heart className="w-12 h-12 mb-4" />
            <p className="text-lg">Nessun preferito salvato</p>
            <p className="text-sm">I post che aggiungi ai preferiti appariranno qui</p>
          </div>
        ) : (
          <PostGrid
            posts={favorites}
            isLoading={isLoading}
            onPostClick={openViewer}
            onDownload={handleDownload}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
          />
        )}
      </main>

      {/* Post Viewer */}
      <PostViewer
        post={selectedPost}
        isOpen={!!selectedPost}
        onClose={handleCloseViewer}
        onPrevious={selectedIndex > 0 ? () => {
          setSelectedPost(favorites[selectedIndex - 1]);
          setSelectedIndex(selectedIndex - 1);
        } : undefined}
        onNext={selectedIndex < favorites.length - 1 ? () => {
          setSelectedPost(favorites[selectedIndex + 1]);
          setSelectedIndex(selectedIndex + 1);
        } : undefined}
        hasPrevious={selectedIndex > 0}
        hasNext={selectedIndex < favorites.length - 1}
      />
    </div>
  );
}
