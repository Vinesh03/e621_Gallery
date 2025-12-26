import { E621Comment } from '@/types/e621';
import { e621Api } from '@/services/e621Api';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, User, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface CommentsSheetProps {
  postId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CommentsSheet({ postId, isOpen, onClose }: CommentsSheetProps) {
  const [comments, setComments] = useState<E621Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && postId) {
      setIsLoading(true);
      setError(null);
      e621Api.getComments(postId)
        .then((data) => {
          setComments(data);
        })
        .catch((err) => {
          setError('Impossibile caricare i commenti');
          console.error(err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setComments([]);
    }
  }, [isOpen, postId]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-xl">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle>Commenti ({comments.length})</SheetTitle>
            {postId && (
              <a
                href={`https://e621.net/posts/${postId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Apri su e621
              </a>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(70vh-80px)] mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              {error}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessun commento
            </div>
          ) : (
            <div className="space-y-4 pr-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-3 rounded-lg bg-secondary/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{comment.creator_name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: it })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                    {comment.body}
                  </p>
                  {comment.score !== 0 && (
                    <div className="text-xs text-muted-foreground">
                      Score: {comment.score > 0 ? '+' : ''}{comment.score}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}