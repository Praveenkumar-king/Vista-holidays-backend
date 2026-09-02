import config from '../config/environment.js';

/**
 * Service to interact with Pexels Curated & Search Image API
 */
export const imageService = {
  /**
   * Search external landscape imagery matching destination or landmark query
   * @param {string} query - Destination or place name
   * @param {number} perPage - Number of photos to retrieve (default: 1, max: 15)
   * @returns {Promise<Object>} Normalized photos array
   */
  async searchImages(query, perPage = 1) {
    const apiKey = config.pexelsApiKey?.trim();

    if (!apiKey) {
      const err = new Error(
        'Pexels API key is not configured on the server. Please add PEXELS_API_KEY to server/.env'
      );
      err.statusCode = 503;
      throw err;
    }

    const safeLimit = Math.min(Math.max(1, parseInt(perPage, 10) || 1), 15);
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${safeLimit}&orientation=landscape`;

    let response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: apiKey
        },
        signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined
      });
    } catch (networkErr) {
      const err = new Error(
        networkErr.name === 'TimeoutError'
          ? 'Image service request timed out. Please try again.'
          : 'Failed to connect to external image service. Please check network connectivity.'
      );
      err.statusCode = 502;
      throw err;
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = {};
      }

      const err = new Error(
        errorData.error || errorData.message || `Image service responded with status ${response.status}`
      );
      err.statusCode = response.status === 401 ? 401 : response.status === 429 ? 429 : 502;
      throw err;
    }

    const data = await response.json();

    // Standardized normalized photo representation
    const photos = (data.photos || []).map((photo) => ({
      id: photo.id,
      url: photo.src?.large2x || photo.src?.large || photo.src?.medium || photo.src?.original,
      mediumUrl: photo.src?.medium || photo.src?.large,
      smallUrl: photo.src?.small || photo.src?.tiny,
      alt: photo.alt || `${query} travel photograph`,
      photographer: photo.photographer || 'Pexels Contributor',
      photographerUrl: photo.photographer_url || '',
      width: photo.width,
      height: photo.height,
      avgColor: photo.avg_color || '#0f172a'
    }));

    return {
      photos,
      totalResults: data.total_results || 0,
      query
    };
  }
};

export default imageService;
