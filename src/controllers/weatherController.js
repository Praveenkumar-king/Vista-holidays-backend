import weatherService from '../services/weatherService.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const weatherController = {
  /**
   * GET /api/weather/current?lat={latitude}&lon={longitude} OR ?query={cityNameOrPincode}
   * Fetches current real-time weather from OpenWeather via server
   */
  async getCurrentWeather(req, res, next) {
    try {
      const { lat, lon, query, q, city } = req.query;
      const searchQuery = query || q || city;

      // 1. Search by City Name or Postal/Pincode
      if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim()) {
        const weatherData = await weatherService.getWeatherByQuery(searchQuery.trim());
        return res.status(200).json({
          success: true,
          data: weatherData
        });
      }

      // 2. Validate presence of coordinates for coordinate-based query
      if (lat === undefined || lon === undefined || lat === '' || lon === '') {
        return res.status(400).json({
          success: false,
          message: 'Either coordinates (lat & lon) or query parameter (query/city) is required.'
        });
      }

      const parsedLat = parseFloat(lat);
      const parsedLon = parseFloat(lon);

      // 2. Validate numeric validity
      if (Number.isNaN(parsedLat) || Number.isNaN(parsedLon)) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude must be valid floating-point numbers.'
        });
      }

      // 3. Validate geographic coordinate ranges
      if (parsedLat < -90 || parsedLat > 90) {
        return res.status(400).json({
          success: false,
          message: 'Latitude must be between -90 and 90 degrees.'
        });
      }

      if (parsedLon < -180 || parsedLon > 180) {
        return res.status(400).json({
          success: false,
          message: 'Longitude must be between -180 and 180 degrees.'
        });
      }

      // 4. Fetch normalized weather data from service
      const weatherData = await weatherService.getCurrentWeather(parsedLat, parsedLon);

      return res.status(200).json({
        success: true,
        data: weatherData
      });
    } catch (error) {
      next(error);
    }
  }
};

export default weatherController;
