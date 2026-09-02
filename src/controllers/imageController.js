import imageService from '../services/imageService.js';

export const imageController = {
  /**
   * GET /api/images/search?query={searchQuery}&perPage={number}
   * Searches external landscape photos for destinations & landmarks
   */
  async searchImages(req, res, next) {
    try {
      const { query, perPage } = req.query;

      // 1. Validate query presence and length
      if (!query || typeof query !== 'string' || !query.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Query parameter "query" is required and cannot be empty.'
        });
      }

      const trimmedQuery = query.trim();

      if (trimmedQuery.length > 120) {
        return res.status(400).json({
          success: false,
          message: 'Query parameter "query" must not exceed 120 characters.'
        });
      }

      // 2. Validate perPage limit
      const parsedPerPage = perPage ? parseInt(perPage, 10) : 1;
      if (Number.isNaN(parsedPerPage) || parsedPerPage < 1 || parsedPerPage > 15) {
        return res.status(400).json({
          success: false,
          message: 'Query parameter "perPage" must be an integer between 1 and 15.'
        });
      }

      // 3. Fetch normalized images from service
      const result = await imageService.searchImages(trimmedQuery, parsedPerPage);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
};

export default imageController;
