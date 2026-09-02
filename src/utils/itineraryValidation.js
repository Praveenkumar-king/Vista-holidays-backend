/**
 * Server-side validation and sanitization for AI Itinerary Planner requests & responses
 */

/**
 * Validate and sanitize incoming itinerary planning request parameters
 * @param {Object} body - Request body
 * @returns {Object} { isValid: boolean, error?: string, data?: Object }
 */
export function validateItineraryRequest(body = {}) {
  const {
    destination,
    days,
    travelStyle = 'Balanced',
    interests = [],
    budget = 'Moderate',
    travelers = 'Couple',
    pace = 'Balanced',
    famousPlaces = [],
    weather = null,
    location = null
  } = body;

  // 1. Destination Validation
  if (!destination || typeof destination !== 'object') {
    return {
      isValid: false,
      error: 'Destination object with a valid "name" field is required.'
    };
  }

  const destinationName = typeof destination.name === 'string' ? destination.name.trim() : '';
  if (!destinationName || destinationName.length < 2 || destinationName.length > 100) {
    return {
      isValid: false,
      error: 'Destination name must be between 2 and 100 characters.'
    };
  }

  const destinationCountry = typeof destination.country === 'string'
    ? destination.country.trim().slice(0, 100)
    : '';

  // 2. Days Count Validation (1 to 14 days)
  const parsedDays = parseInt(days, 10);
  if (Number.isNaN(parsedDays) || parsedDays < 1 || parsedDays > 14) {
    return {
      isValid: false,
      error: 'Trip duration (days) must be an integer between 1 and 14 days.'
    };
  }

  // 3. Travel Style Validation
  const safeTravelStyle = typeof travelStyle === 'string' && travelStyle.trim()
    ? travelStyle.trim().slice(0, 50)
    : 'Balanced';

  // 4. Interests Array Validation
  const safeInterests = Array.isArray(interests)
    ? interests
        .filter((item) => typeof item === 'string' && item.trim())
        .map((item) => item.trim().slice(0, 50))
        .slice(0, 10)
    : [];

  // 5. Budget, Travelers & Pace Validation
  const safeBudget = typeof budget === 'string' && budget.trim() ? budget.trim().slice(0, 30) : 'Moderate';
  const safeTravelers = typeof travelers === 'string' && travelers.trim() ? travelers.trim().slice(0, 30) : 'Couple';
  const safePace = typeof pace === 'string' && pace.trim() ? pace.trim().slice(0, 30) : 'Balanced';

  // 6. Famous Places List
  const safeFamousPlaces = Array.isArray(famousPlaces)
    ? famousPlaces
        .filter((item) => typeof item === 'string' && item.trim())
        .map((item) => item.trim().slice(0, 80))
        .slice(0, 10)
    : [];

  // 7. Optional Weather Context
  const safeWeather = weather && typeof weather === 'object' && !Array.isArray(weather)
    ? {
        temperature: weather.temperature,
        condition: typeof weather.condition === 'string' ? weather.condition.slice(0, 50) : ''
      }
    : null;

  return {
    isValid: true,
    data: {
      destination: {
        name: destinationName,
        country: destinationCountry
      },
      days: parsedDays,
      travelStyle: safeTravelStyle,
      interests: safeInterests,
      budget: safeBudget,
      travelers: safeTravelers,
      pace: safePace,
      famousPlaces: safeFamousPlaces,
      weather: safeWeather,
      location: location && typeof location === 'object' ? location : null
    }
  };
}

/**
 * Clean and parse JSON from Gemini (strips markdown code fences if present)
 * @param {string} rawOutput - Raw model response
 * @returns {Object} Parsed JSON object
 */
export function parseGeminiJson(rawOutput = '') {
  if (!rawOutput || typeof rawOutput !== 'string') {
    throw new Error('Empty response received from Gemini.');
  }

  let cleaned = rawOutput.trim();

  // Remove markdown code fences ```json ... ``` or ``` ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  // Find first { and last } if surrounded by extra commentary
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[JSON Parse Error]: Could not parse Gemini itinerary output:', cleaned.slice(0, 300));
    throw new Error('Failed to parse structured JSON from AI response.');
  }
}

/**
 * Validate and normalize parsed Gemini itinerary object
 * @param {Object} parsed - Parsed JSON object
 * @param {Object} originalRequest - The user request data
 * @returns {Object} Normalized itinerary payload
 */
export function validateAndNormalizeItinerary(parsed, originalRequest) {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid itinerary format received from AI.');
  }

  const destinationName = parsed.destination?.name || originalRequest.destination.name;
  const destinationCountry = parsed.destination?.country || originalRequest.destination.country;

  const rawDays = Array.isArray(parsed.days) ? parsed.days : [];
  if (rawDays.length === 0) {
    throw new Error('Itinerary did not contain day-by-day activities.');
  }

  // Normalize each day
  const normalizedDays = rawDays.map((dayObj, index) => {
    const dayNumber = typeof dayObj.day === 'number' ? dayObj.day : index + 1;
    const title = typeof dayObj.title === 'string' && dayObj.title.trim()
      ? dayObj.title.trim()
      : `Day ${dayNumber}: Highlights`;
    const summary = typeof dayObj.summary === 'string' && dayObj.summary.trim()
      ? dayObj.summary.trim()
      : '';

    const rawActivities = Array.isArray(dayObj.activities) ? dayObj.activities : [];
    const normalizedActivities = rawActivities.map((act) => {
      const time = typeof act.time === 'string' && act.time.trim() ? act.time.trim() : 'Activity';
      const title = typeof act.title === 'string' && act.title.trim() ? act.title.trim() : 'Sightseeing Experience';
      const description = typeof act.description === 'string' && act.description.trim()
        ? act.description.trim()
        : '';
      const duration = typeof act.duration === 'string' && act.duration.trim() ? act.duration.trim() : '1-2 Hours';
      const category = typeof act.category === 'string' && act.category.trim() ? act.category.trim() : 'Exploration';

      return {
        time,
        title,
        description,
        duration,
        category
      };
    });

    return {
      day: dayNumber,
      title,
      summary,
      activities: normalizedActivities
    };
  });

  return {
    destination: {
      name: destinationName,
      country: destinationCountry
    },
    daysCount: normalizedDays.length,
    travelStyle: originalRequest.travelStyle,
    interests: originalRequest.interests,
    budget: originalRequest.budget,
    travelers: originalRequest.travelers,
    pace: originalRequest.pace,
    days: normalizedDays,
    generatedAt: new Date().toISOString()
  };
}

export default {
  validateItineraryRequest,
  parseGeminiJson,
  validateAndNormalizeItinerary
};
