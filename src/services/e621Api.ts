import { E621Post, E621PostsResponse, E621User, SearchParams, AuthCredentials, E621Tag, MediaFilter, E621Comment } from '@/types/e621';
import { toast } from 'sonner';

const BASE_URL = 'https://e621.net';
const USER_AGENT = 'E6Gallery/1.0.0 (Lovable App)';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public endpoint?: string,
    public isNetworkError: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class E621Api {
  private credentials: AuthCredentials | null = null;
  private requestCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  setCredentials(credentials: AuthCredentials | null) {
    this.credentials = credentials;
    // Clear cache when credentials change
    if (credentials) {
      this.clearCache();
    }
  }

  getCredentials(): AuthCredentials | null {
    return this.credentials;
  }

  isAuthenticated(): boolean {
    return this.credentials !== null;
  }

  clearCache() {
    this.requestCache.clear();
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/json',
    };

    if (this.credentials) {
      const authString = btoa(`${this.credentials.username}:${this.credentials.apiKey}`);
      headers['Authorization'] = `Basic ${authString}`;
    }

    return headers;
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | undefined>): string {
    const url = new URL(endpoint, BASE_URL);
    
    // Add _client parameter for user agent
    url.searchParams.set('_client', USER_AGENT);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Enhanced fetch with retry logic and better error handling
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retries = MAX_RETRIES,
    useCache = false
  ): Promise<Response> {
    // Check cache for GET requests
    if (useCache && options.method === 'GET') {
      const cached = this.requestCache.get(url);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('📦 Using cached response for:', url);
        return new Response(JSON.stringify(cached.data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`🌐 Fetching (attempt ${attempt + 1}/${retries + 1}):`, url);
        
        const response = await fetch(url, {
          ...options,
          headers: {
            ...this.getHeaders(),
            ...options.headers,
          },
          signal: options.signal || AbortSignal.timeout(30000), // 30s timeout
        });

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
          console.warn(`⏰ Rate limited. Retry after ${retryAfter}s`);
          
          if (attempt < retries) {
            await sleep(retryAfter * 1000);
            continue;
          }
          
          throw new ApiError(
            'Troppe richieste. Riprova tra qualche minuto.',
            429,
            url
          );
        }

        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
          throw new ApiError(
            'Autenticazione fallita. Verifica le tue credenziali.',
            response.status,
            url
          );
        }

        // Handle not found
        if (response.status === 404) {
          throw new ApiError(
            'Risorsa non trovata.',
            404,
            url
          );
        }

        // Handle server errors
        if (response.status >= 500) {
          const errorMsg = `Errore del server (${response.status})`;
          
          if (attempt < retries) {
            console.warn(`${errorMsg}. Retrying...`);
            await sleep(RETRY_DELAY * Math.pow(2, attempt));
            continue;
          }
          
          throw new ApiError(errorMsg, response.status, url);
        }

        // Handle other non-OK responses
        if (!response.ok) {
          throw new ApiError(
            `Errore HTTP: ${response.status} ${response.statusText}`,
            response.status,
            url
          );
        }

        // Cache successful GET responses
        if (useCache && options.method === 'GET') {
          const data = await response.clone().json();
          this.requestCache.set(url, { data, timestamp: Date.now() });
        }

        console.log('✅ Fetch successful:', url);
        return response;

      } catch (error: any) {
        lastError = error;

        // Handle network errors
        if (error.name === 'TypeError' || error.message.includes('fetch')) {
          console.error('🌐 Network error:', error.message);
          
          if (attempt < retries) {
            console.log(`Retrying after network error... (${attempt + 1}/${retries})`);
            await sleep(RETRY_DELAY * Math.pow(2, attempt));
            continue;
          }
          
          throw new ApiError(
            'Errore di connessione. Verifica la tua connessione internet.',
            undefined,
            url,
            true
          );
        }

        // Handle timeout
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          console.error('⏱️ Request timeout:', url);
          
          if (attempt < retries) {
            console.log('Retrying after timeout...');
            await sleep(RETRY_DELAY * Math.pow(2, attempt));
            continue;
          }
          
          throw new ApiError(
            'Richiesta scaduta. Riprova.',
            undefined,
            url,
            true
          );
        }

        // Re-throw ApiErrors immediately
        if (error instanceof ApiError) {
          throw error;
        }

        // Unknown error - retry if possible
        if (attempt < retries) {
          console.error('Unknown error, retrying:', error);
          await sleep(RETRY_DELAY * Math.pow(2, attempt));
          continue;
        }
      }
    }

    // All retries exhausted
    throw lastError || new ApiError('Richiesta fallita dopo diversi tentativi', undefined, url);
  }

  private buildRatingQuery(rating?: string): string {
    if (!rating || rating === 'sqe') return '';

    const ratingMap: Record<string, string> = {
      s: 'rating:s',
      q: 'rating:q',
      e: 'rating:e',
      sq: '( ~rating:s ~rating:q )',
      se: '( ~rating:s ~rating:e )',
      qe: '( ~rating:q ~rating:e )',
    };

    return ratingMap[rating] || '';
  }

  private buildMediaTypeQuery(mediaType?: MediaFilter): string {
    if (!mediaType || mediaType === 'all') return '';
    
    if (mediaType === 'video') {
      return 'type:webm';
    } else if (mediaType === 'image') {
      return '-type:webm -type:gif';
    }
    return '';
  }

  async searchTags(query: string, limit = 10): Promise<E621Tag[]> {
    if (!query || query.length < 2) return [];
    
    const url = this.buildUrl('/tags.json', {
      'search[name_matches]': `${query}*`,
      'search[order]': 'count',
      'limit': limit,
    });

    try {
      const response = await this.fetchWithRetry(url, { method: 'GET' }, 1, true); // Use cache, fewer retries
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Tag search error:', error);
      return []; // Fail silently for autocomplete
    }
  }

  async searchPosts(params: SearchParams): Promise<E621Post[]> {
    const { tags = '', limit = 20, page, rating, mediaType } = params;
    
    // Build search query with rating and media type filters
    const ratingQuery = this.buildRatingQuery(rating);
    const mediaQuery = this.buildMediaTypeQuery(mediaType);
    const fullTags = [tags, ratingQuery, mediaQuery].filter(Boolean).join(' ').trim();

    const url = this.buildUrl('/posts.json', {
      tags: fullTags || undefined,
      limit,
      page: page !== undefined ? String(page) : undefined,
    });

    try {
      const response = await this.fetchWithRetry(url, { method: 'GET' }, MAX_RETRIES, true);
      const data: E621PostsResponse = await response.json();
      return data.posts;
    } catch (error) {
      console.error('E621 API Error:', error);
      
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Impossibile caricare i post');
      }
      
      throw error;
    }
  }

  async getPost(id: number): Promise<E621Post> {
    const url = this.buildUrl(`/posts/${id}.json`);

    const response = await this.fetchWithRetry(url, { method: 'GET' }, MAX_RETRIES, true);
    const data = await response.json();
    return data.post;
  }

  async getCurrentUser(): Promise<E621User> {
    if (!this.credentials) {
      throw new Error('Not authenticated');
    }

    const url = this.buildUrl(`/users/${this.credentials.username}.json`);
    const response = await this.fetchWithRetry(url, { method: 'GET' });
    return response.json();
  }

  async validateCredentials(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }

  async getFavorites(username: string, limit = 20, page?: number): Promise<E621Post[]> {
    const url = this.buildUrl('/posts.json', {
      tags: `fav:${username}`,
      limit,
      page: page !== undefined ? String(page) : undefined,
    });

    const response = await this.fetchWithRetry(url, { method: 'GET' }, MAX_RETRIES, true);
    const data: E621PostsResponse = await response.json();
    return data.posts;
  }

  async addFavorite(postId: number): Promise<void> {
    if (!this.credentials) {
      throw new Error('Not authenticated');
    }

    const url = this.buildUrl('/favorites.json');

    await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `post_id=${postId}`,
    });

    // Clear favorites cache
    this.clearCache();
  }

  async removeFavorite(postId: number): Promise<void> {
    if (!this.credentials) {
      throw new Error('Not authenticated');
    }

    const url = this.buildUrl(`/favorites/${postId}.json`);

    await this.fetchWithRetry(url, {
      method: 'DELETE',
    });

    // Clear favorites cache
    this.clearCache();
  }

  async votePost(postId: number, score: 1 | -1, unvote: boolean = false): Promise<{ score: number; up: number; down: number; our_score: number }> {
    if (!this.credentials) {
      throw new Error('Not authenticated');
    }

    const url = this.buildUrl(`/posts/${postId}/votes.json`);

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `score=${score}&no_unvote=false`,
    });

    return response.json();
  }

  async getComments(postId: number): Promise<E621Comment[]> {
    const url = this.buildUrl('/comments.json', {
      'search[post_id]': postId,
      limit: 50,
    });

    const response = await this.fetchWithRetry(url, { method: 'GET' }, 2, true);
    return response.json();
  }

  getDownloadUrl(post: E621Post): string | null {
    return post.file.url;
  }

  getPreviewUrl(post: E621Post): string | null {
    return post.preview.url || post.sample.url || post.file.url;
  }

  getSampleUrl(post: E621Post): string | null {
    return post.sample.url || post.file.url;
  }

  /**
   * Get playback URL for video posts.
   * CRITICAL STRATEGY: Prefer original MP4 files for maximum compatibility.
   */
  getVideoPlaybackUrl(post: E621Post): string | null {
    const ext = (post.file.ext || '').toLowerCase();
    
    if (ext !== 'webm' && ext !== 'mp4') {
      console.log(`[Video] Post ${post.id}: Not a video (ext: ${ext})`);
      return null;
    }

    // If original is MP4, use it directly
    if (ext === 'mp4' && post.file.url) {
      console.log(`[Video] Post ${post.id}: Using original MP4 file`);
      return post.file.url;
    }

    // Search for MP4 alternatives
    console.log(`[Video] Post ${post.id}: Original is WebM, searching for MP4 alternatives...`);
    
    const alternates = post.sample.alternates;
    
    if (!alternates) {
      console.warn(`[Video] Post ${post.id}: No alternates available for WebM file`);
      return null;
    }

    let videoUrl: string | null = null;
    let source = '';

    if (alternates['480p']?.url) {
      videoUrl = alternates['480p'].url;
      source = '480p';
    } else if (alternates['720p']?.url) {
      videoUrl = alternates['720p'].url;
      source = '720p';
    } else if (alternates.original?.url) {
      videoUrl = alternates.original.url;
      source = 'original alternate';
    } else if (alternates.variants?.mp4?.url) {
      videoUrl = alternates.variants.mp4.url;
      source = 'MP4 variant';
    }
    
    if (videoUrl) {
      console.log(`[Video] Post ${post.id}: Found ${source} MP4`);
      return videoUrl;
    }

    console.warn(`[Video] Post ${post.id}: ❌ No MP4 alternatives found`);
    return null;
  }
}

export const e621Api = new E621Api();
export { ApiError };
