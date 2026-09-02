import config from '../config/environment.js';

/**
 * Service to interact with OpenWeather Current Weather API
 */
export const weatherService = {
  /**
   * Fetch and normalize current weather for given latitude & longitude
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<Object>} Normalized weather data
   */
  async getCurrentWeather(lat, lon) {
    const apiKey = config.openWeatherApiKey?.trim();

    if (!apiKey) {
      const err = new Error(
        'OpenWeather API key is not configured on the server. Please add OPENWEATHER_API_KEY to server/.env'
      );
      err.statusCode = 503;
      throw err;
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

    let response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined
      });
    } catch (networkErr) {
      const err = new Error(
        networkErr.name === 'TimeoutError'
          ? 'OpenWeather service request timed out. Please try again.'
          : 'Failed to reach OpenWeather service. Please check network connectivity.'
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
        errorData.message
          ? `OpenWeather: ${errorData.message}`
          : `OpenWeather request failed with status ${response.status}`
      );
      err.statusCode = response.status === 401 ? 401 : response.status === 404 ? 404 : response.status === 429 ? 429 : 502;
      throw err;
    }

    const data = await response.json();

    // Standardized normalized weather response
    return {
      location: {
        name: data.name || '',
        country: data.sys?.country || ''
      },
      temperature: Math.round(data.main?.temp ?? 0),
      feelsLike: Math.round(data.main?.feels_like ?? 0),
      tempMin: Math.round(data.main?.temp_min ?? 0),
      tempMax: Math.round(data.main?.temp_max ?? 0),
      condition: data.weather?.[0]?.main || 'Clear',
      description: data.weather?.[0]?.description || '',
      humidity: data.main?.humidity ?? 0,
      windSpeed: data.wind?.speed ?? 0,
      pressure: data.main?.pressure ?? 0,
      visibility: typeof data.visibility === 'number' ? Math.round(data.visibility / 1000) : null, // in km
      icon: data.weather?.[0]?.icon || '01d',
      sunrise: data.sys?.sunrise ? new Date(data.sys.sunrise * 1000).toISOString() : null,
      sunset: data.sys?.sunset ? new Date(data.sys.sunset * 1000).toISOString() : null,
      coordinates: {
        latitude: Number(lat),
        longitude: Number(lon)
      },
      fetchedAt: new Date().toISOString()
    };
  },

  /**
   * Fetch and normalize current weather for given city name or pincode/postal code
   * @param {string} query - City name or pincode
   * @returns {Promise<Object>} Normalized weather data
   */
  async getWeatherByQuery(query) {
    const apiKey = config.openWeatherApiKey?.trim();

    if (!apiKey) {
      const err = new Error(
        'OpenWeather API key is not configured on the server. Please add OPENWEATHER_API_KEY to server/.env'
      );
      err.statusCode = 503;
      throw err;
    }

    const trimmed = query.trim();
    const isPincode = /^\d{5,6}$/.test(trimmed);
    const zipParam = /^\d{6}$/.test(trimmed) ? `${trimmed},IN` : trimmed;

    // 1. Try standard query param 'q' (supports city names and many postal queries)
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(trimmed)}&appid=${apiKey}&units=metric`;

    let response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined
      });
    } catch (networkErr) {
      const err = new Error(
        networkErr.name === 'TimeoutError'
          ? 'OpenWeather service request timed out. Please try again.'
          : 'Failed to reach OpenWeather service. Please check network connectivity.'
      );
      err.statusCode = 502;
      throw err;
    }

    // 2. If 'q' returned 404 and query looks like a postal code, attempt postal lookup via 'zip'
    if (!response.ok && response.status === 404 && isPincode) {
      try {
        const zipUrl = `https://api.openweathermap.org/data/2.5/weather?zip=${encodeURIComponent(zipParam)}&appid=${apiKey}&units=metric`;
        const zipResponse = await fetch(zipUrl, {
          signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined
        });
        if (zipResponse.ok) {
          response = zipResponse;
        }
      } catch (e) {
        // Retain original response
      }
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = {};
      }

      const err = new Error(
        response.status === 404
          ? `Could not find weather for "${trimmed}". Please verify the city name or pincode and try again.`
          : (errorData.message || `OpenWeather request failed with status ${response.status}`)
      );
      err.statusCode = response.status === 401 ? 401 : response.status === 404 ? 404 : response.status === 429 ? 429 : 502;
      throw err;
    }

    const data = await response.json();

    return {
      location: {
        name: data.name || trimmed,
        country: data.sys?.country || ''
      },
      temperature: Math.round(data.main?.temp ?? 0),
      feelsLike: Math.round(data.main?.feels_like ?? 0),
      tempMin: Math.round(data.main?.temp_min ?? 0),
      tempMax: Math.round(data.main?.temp_max ?? 0),
      condition: data.weather?.[0]?.main || 'Clear',
      description: data.weather?.[0]?.description || '',
      humidity: data.main?.humidity ?? 0,
      windSpeed: data.wind?.speed ?? 0,
      pressure: data.main?.pressure ?? 0,
      visibility: typeof data.visibility === 'number' ? Math.round(data.visibility / 1000) : null, // in km
      icon: data.weather?.[0]?.icon || '01d',
      sunrise: data.sys?.sunrise ? new Date(data.sys.sunrise * 1000).toISOString() : null,
      sunset: data.sys?.sunset ? new Date(data.sys.sunset * 1000).toISOString() : null,
      coordinates: {
        latitude: data.coord?.lat ? Number(data.coord.lat) : null,
        longitude: data.coord?.lon ? Number(data.coord.lon) : null
      },
      fetchedAt: new Date().toISOString()
    };
  }
};

export default weatherService;
