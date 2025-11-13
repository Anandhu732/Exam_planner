/**
 * Media Player Module - Embed YouTube videos, playlists, and search results
 */

import { $, showToast } from './utils';

class PlayerManager {
  private urlInput!: HTMLInputElement;
  private loadButton!: HTMLElement;
  private clearButton!: HTMLElement;
  private frameContainer!: HTMLElement;

  init(): void {
    try {
      this.urlInput = $('#playlistUrl') as HTMLInputElement;
      this.loadButton = $('#loadPlaylist');
      this.clearButton = $('#clearPlayer');
      this.frameContainer = $('#playerFrame');

      this.loadButton.addEventListener('click', () => this.loadContent());
      this.clearButton.addEventListener('click', () => this.clear());

      this.urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.loadContent();
        }
      });

      // Setup preset buttons
      this.setupPresets();

      // Load saved content
      const savedUrl = localStorage.getItem('youtube-content');
      if (savedUrl) {
        this.urlInput.value = savedUrl;
        this.embedContent(savedUrl);
      }
    } catch (error) {
      console.error('Player initialization failed:', error);
    }
  }

  /**
   * Setup preset buttons
   */
  private setupPresets(): void {
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const query = (btn as HTMLElement).dataset.query;
        if (query) {
          this.loadSearch(query);
        }
      });
    });
  }

  /**
   * Extract video ID from YouTube URL
   */
  private extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
      /youtube\.com\/embed\/([^?&\s]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Extract playlist ID from YouTube URL
   */
  private extractPlaylistId(url: string): string | null {
    const patterns = [
      /[?&]list=([^&]+)/,
      /youtube\.com\/playlist\?list=([^&]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Load content from URL or search query
   */
  private loadContent(): void {
    const input = this.urlInput.value.trim();

    if (!input) {
      showToast('Please enter a YouTube URL or search query', 3000);
      return;
    }

    // Check if it's a URL
    if (input.includes('youtube.com') || input.includes('youtu.be')) {
      this.embedContent(input);
      localStorage.setItem('youtube-content', input);
      showToast('Content loaded!', 2000);
    } else {
      // Treat as search query
      this.loadSearch(input);
    }
  }

  /**
   * Load search results for a query
   */
  private loadSearch(query: string): void {
    const encodedQuery = encodeURIComponent(query);

    // Embed first search result
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed?listType=search&list=${encodedQuery}&autoplay=0`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;

    this.frameContainer.innerHTML = '';
    this.frameContainer.appendChild(iframe);

    this.urlInput.value = query;
    localStorage.setItem('youtube-content', query);
    showToast('Search loaded!', 2000);
  }

  /**
   * Embed YouTube content (video or playlist)
   */
  private embedContent(url: string): void {
    const playlistId = this.extractPlaylistId(url);
    const videoId = this.extractVideoId(url);

    const iframe = document.createElement('iframe');

    if (playlistId) {
      // Embed playlist
      iframe.src = `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=0`;
    } else if (videoId) {
      // Embed single video
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=0`;
    } else {
      showToast('Invalid YouTube URL', 3000);
      return;
    }

    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;

    this.frameContainer.innerHTML = '';
    this.frameContainer.appendChild(iframe);
  }

  /**
   * Clear player
   */
  clear(): void {
    this.frameContainer.innerHTML = '';
    this.urlInput.value = '';
    localStorage.removeItem('youtube-content');
    showToast('Player cleared!', 2000);
  }
}

export const player = new PlayerManager();
