import { E621Post, E621PostsResponse, E621User, SearchParams, AuthCredentials, E621Tag, MediaFilter, E621Comment } from '@/types/e621';

const BASE_URL = 'https://e621.net';
const USER_AGENT = 'E6Gallery/1.0.0 (Lovable App)';

class E621Api {
  private credentials: AuthCredentials | null = null;

  setCredentials(credentials: AuthCredentials | null) {
    this.credentials = credentials;
  }

  getCredentials(): AuthCredentials | null {
    return this.credentials;
  }

  isAuthenticated(): boolean {
    return this.credentials !== null;
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
    
    // Add _client parameter for user agent (since we can't set headers in some cases)
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
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Tag search error:', error);
      return [];
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
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data: E621PostsResponse = await response.json();
      return data.posts;
    } catch (error) {
      console.error('E621 API Error:', error);
      throw error;
    }
  }

  async getPost(id: number): Promise<E621Post> {
    const url = this.buildUrl(`/posts/${id}.json`);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.post;
  }

  async getCurrentUser(): Promise<E621User> {
    if (!this.credentials) {
      throw new Error('Not authenticated');
    }

    const url = this.buildUrl(`/users/${this.credentials.username}.json`);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

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

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data: E621PostsResponse = await response.json();
    return data.posts;
  }

  async addFavorite(postId: number): Promise<void> {
    if (!this.credentials) {
      throw new Error('Not authenticated');
    }

    const url = this.buildUrl('/favorites.json');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `post_id=${postId}`,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
  }

  async removeFavorite(postId: number): Promise<void> {
    if (!this.credentials) {
      throw new Error('Not authenticated');
    }

    // Note: DELETE is not CORS-safe, so this might need to be handled differently
    const url = this.buildUrl(`/favorites/${postId}.json`);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`API Error: ${response.status}`);
    }
  }

  async votePost(postId: number, score: 1 | -1, unvote: boolean = false): Promise<{ score: number; up: number; down: number; our_score: number }> {
    if (!this.credentials) {
      throw new Error('Not authenticated');
    }

    const url = this.buildUrl(`/posts/${postId}/votes.json`);

    // e621 API: no_unvote=false means it will toggle (remove) if same vote is sent twice
    // To explicitly remove a vote, send the same vote with no_unvote=false
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `score=${score}&no_unvote=false`,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  async getComments(postId: number): Promise<E621Comment[]> {
    const url = this.buildUrl('/comments.json', {
      'search[post_id]': postId,
      limit: 50,
    });

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  getDownloadUrl(post: E621Post): string | null {
    return post.file.url;
  }

  /**
   * Best URL for rendering a preview (images) in the UI.
   * For video posts this will typically be a JPG preview.
   */
  getPreviewUrl(post: E621Post): string | null {
    return post.preview.url || post.sample.url || post.file.url;
  }

  /**
   * Best URL for rendering the main media (images).
   * Note: for video posts, `sample.url` is a poster image, not the video.
   */
  getSampleUrl(post: E621Post): string | null {
    return post.sample.url || post.file.url;
  }

  /**
   * Get playback URL for video posts.
   * CRITICAL STRATEGY: Prefer original MP4 files for maximum compatibility.
   * Only search for alternatives if the original is WebM.
   * 
   * Priority:
   * 1. Original file if MP4 (most reliable)
   * 2. If WebM, look for 480p MP4 alternate
   * 3. If WebM, look for 720p MP4 alternate
   * 4. If WebM, look for any MP4 variant
   * 5. Return null if only WebM available (to prevent crashes)
   */
  getVideoPlaybackUrl(post: E621Post): string | null {
    const ext = (post.file.ext || '').toLowerCase();
    
    // Only process video files
    if (ext !== 'webm' && ext !== 'mp4') {
      console.log(`[Video] Post ${post.id}: Not a video (ext: ${ext})`);
      return null;
    }

    // FIRST: If original is MP4, use it directly (most reliable)
    if (ext === 'mp4' && post.file.url) {
      console.log(`[Video] Post ${post.id}: Using original MP4 file`);
      console.log(`[Video] URL: ${post.file.url}`);
      return post.file.url;
    }

    // If we're here, the original is WebM, try to find MP4 alternatives
    console.log(`[Video] Post ${post.id}: Original is WebM, searching for MP4 alternatives...`);
    
    const alternates = post.sample.alternates;
    
    if (!alternates) {
      console.warn(`[Video] Post ${post.id}: No alternates available for WebM file`);
      return null;
    }

    console.log(`[Video] Post ${post.id}: Alternates structure:`, JSON.stringify(alternates, null, 2));

    // Try different paths for MP4 alternatives
    // Check samples object for 480p and 720p
    let videoUrl: string | null = null;
    let source = '';

    // Check for 480p in samples
    if (alternates['480p']?.url) {
      videoUrl = alternates['480p'].url;
      source = '480p';
    }
    // Check for 720p in samples
    else if (alternates['720p']?.url) {
      videoUrl = alternates['720p'].url;
      source = '720p';
    }
    // Check for original in alternates
    else if (alternates.original?.url) {
      videoUrl = alternates.original.url;
      source = 'original alternate';
    }
    // Check for MP4 variant
    else if (alternates.variants?.mp4?.url) {
      videoUrl = alternates.variants.mp4.url;
      source = 'MP4 variant';
    }
    
    if (videoUrl) {
      console.log(`[Video] Post ${post.id}: Found ${source} MP4`);
      console.log(`[Video] URL: ${videoUrl}`);
      return videoUrl;
    }

    console.warn(`[Video] Post ${post.id}: ❌ No MP4 alternatives found for WebM file`);
    console.warn(`[Video] Post ${post.id}: Available alternates keys:`, Object.keys(alternates));
    return null;
  }
}

export const e621Api = new E621Api();