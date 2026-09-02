import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/environment.js';
import aiConfig from '../config/ai.js';
import { parseGeminiJson, validateAndNormalizeItinerary } from '../utils/itineraryValidation.js';

/**
 * Service for Google Gemini AI Travel Assistant & Itinerary Planner
 */
export const geminiService = {
  /**
   * Generate conversational travel advice using Gemini
   * @param {Object} params - { message, conversation, context }
   * @returns {Promise<Object>} { reply, model }
   */
  async generateTravelAdvice({ message, conversation = [], context = {} }) {
    const apiKey = config.geminiApiKey?.trim();

    if (!apiKey) {
      const err = new Error(
        'Gemini API key is not configured on the server. Please add GEMINI_API_KEY to server/.env'
      );
      err.statusCode = 503;
      throw err;
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);

      const model = genAI.getGenerativeModel({
        model: aiConfig.modelName,
        systemInstruction: aiConfig.systemInstruction
      });

      // Build contextual briefing
      const contextPills = [];
      if (context.destination?.name) {
        contextPills.push(`Active Destination: ${context.destination.name}, ${context.destination.country || ''}`);
      } else if (context.location?.displayName) {
        contextPills.push(`Active Location: ${context.location.displayName}`);
      }

      if (context.weather?.temperature !== undefined) {
        contextPills.push(
          `Current Live Weather: ${context.weather.temperature}°C, ${context.weather.condition || ''} (Feels like ${context.weather.feelsLike ?? context.weather.temperature}°C)`
        );
      }

      const contextPreamble = contextPills.length > 0
        ? `[Application Travel Context: ${contextPills.join(' | ')}]\n\n`
        : '';

      const validHistory = (Array.isArray(conversation) ? conversation : [])
        .slice(-10)
        .filter((msg) => msg && typeof (msg.text || msg.content) === 'string' && (msg.text || msg.content).trim())
        .map((msg) => ({
          role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: (msg.text || msg.content).trim() }]
        }));

      const chat = model.startChat({
        history: validHistory,
        generationConfig: {
          temperature: aiConfig.temperature,
          maxOutputTokens: aiConfig.maxOutputTokens
        }
      });

      const promptWithContext = `${contextPreamble}${message.trim()}`;
      const result = await chat.sendMessage(promptWithContext);
      const response = await result.response;
      const reply = response.text();

      if (!reply || !reply.trim()) {
        throw new Error('Gemini returned an empty response. Please try rephrasing your question.');
      }

      return {
        reply: reply.trim(),
        model: aiConfig.modelName
      };
    } catch (apiError) {
      console.error('[GeminiService Error]:', apiError.message);

      if (apiError.message?.includes('API_KEY_INVALID') || apiError.status === 400 || apiError.status === 401) {
        const err = new Error('Invalid Gemini API Key. Please verify your GEMINI_API_KEY in server/.env');
        err.statusCode = 401;
        throw err;
      }

      if (apiError.message?.includes('RESOURCE_EXHAUSTED') || apiError.status === 429) {
        const err = new Error('Gemini API rate limit exceeded. Please wait a moment before asking another question.');
        err.statusCode = 429;
        throw err;
      }

      if (apiError.statusCode) {
        throw apiError;
      }

      const err = new Error(
        'The Travel Assistant is temporarily unavailable. Please verify server configuration.'
      );
      err.statusCode = 502;
      throw err;
    }
  },

  /**
   * Generate a structured, day-by-day travel itinerary using Gemini
   * @param {Object} params - Validated itinerary planning parameters
   * @returns {Promise<Object>} Normalized day-by-day itinerary object
   */
  async generateItinerary(params) {
    const apiKey = config.geminiApiKey?.trim();

    if (!apiKey) {
      const err = new Error(
        'Gemini API key is not configured on the server. Please add GEMINI_API_KEY to server/.env'
      );
      err.statusCode = 503;
      throw err;
    }

    const {
      destination,
      days,
      travelStyle,
      interests = [],
      budget,
      travelers,
      pace,
      famousPlaces = [],
      weather
    } = params;

    const itinerarySystemPrompt = `You are an expert AI Travel Planner.
Your task is to generate a realistic, balanced, highly enjoyable day-by-day travel itinerary.

STRICT JSON OUTPUT REQUIREMENT:
You MUST respond with a valid JSON object ONLY. No markdown conversational chatter, no prose before or after the JSON.
Schema:
{
  "destination": {
    "name": "${destination.name}",
    "country": "${destination.country || ''}"
  },
  "days": [
    {
      "day": 1,
      "title": "Day theme or primary area",
      "summary": "Brief 1-2 sentence overview of the day's focus",
      "activities": [
        {
          "time": "Morning",
          "title": "Activity name",
          "description": "Concise 1-2 sentence description of the experience",
          "duration": "Estimated time (e.g. '2-3 Hours')",
          "category": "Landmark / Culture / Food / Nature / Leisure"
        },
        {
          "time": "Afternoon",
          "title": "Activity name",
          "description": "Concise 1-2 sentence description",
          "duration": "Estimated time",
          "category": "Category name"
        },
        {
          "time": "Evening",
          "title": "Activity name",
          "description": "Concise 1-2 sentence description",
          "duration": "Estimated time",
          "category": "Dining / Nightlife / Leisure"
        }
      ]
    }
  ]
}

Planning Rules:
1. Generate EXACTLY ${days} days (from Day 1 to Day ${days}).
2. Group geographically sensible attractions together to minimize unnecessary transit.
3. Incorporate real famous landmarks and authentic local cuisine.
4. Respect the requested travel style: ${travelStyle}, pace: ${pace}, budget: ${budget}, and travelers: ${travelers}.
5. Do not overload single days with impossible schedules. Provide 2-3 quality activities per day.`;

    // Construct prompt context
    const contextDetails = [
      `Destination: ${destination.name}${destination.country ? `, ${destination.country}` : ''}`,
      `Total Days: ${days}`,
      `Travel Style: ${travelStyle}`,
      `Pace: ${pace}`,
      `Budget Preference: ${budget}`,
      `Travelers Group: ${travelers}`
    ];

    if (interests.length > 0) {
      contextDetails.push(`Key Interests: ${interests.join(', ')}`);
    }

    if (famousPlaces.length > 0) {
      contextDetails.push(`Known Authentic Landmarks to Include: ${famousPlaces.join(', ')}`);
    }

    if (weather?.temperature !== undefined) {
      contextDetails.push(`Current Meteorological Context: ${weather.temperature}°C, ${weather.condition || ''}`);
    }

    const userPrompt = `Generate a complete ${days}-day structured travel itinerary for ${destination.name}.\n\nTrip Parameters:\n${contextDetails.map((c) => `- ${c}`).join('\n')}\n\nRespond ONLY with the JSON object.`;

    try {
      const genAI = new GoogleGenerativeAI(apiKey);

      const model = genAI.getGenerativeModel({
        model: aiConfig.modelName,
        systemInstruction: itinerarySystemPrompt,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 3000,
          responseMimeType: 'application/json'
        }
      });

      const result = await model.generateContent(userPrompt);
      const response = await result.response;
      const rawText = response.text();

      if (!rawText || !rawText.trim()) {
        throw new Error('Gemini returned an empty itinerary response.');
      }

      // Parse JSON safely & validate structure
      const parsedJson = parseGeminiJson(rawText);
      const normalizedItinerary = validateAndNormalizeItinerary(parsedJson, params);

      return normalizedItinerary;
    } catch (apiError) {
      console.error('[Gemini Itinerary Error]:', apiError.message);

      if (apiError.message?.includes('API_KEY_INVALID') || apiError.status === 400 || apiError.status === 401) {
        const err = new Error('Invalid Gemini API Key. Please verify your GEMINI_API_KEY in server/.env');
        err.statusCode = 401;
        throw err;
      }

      if (apiError.message?.includes('RESOURCE_EXHAUSTED') || apiError.status === 429) {
        const err = new Error('Gemini rate limit reached. Please wait a moment before generating another itinerary.');
        err.statusCode = 429;
        throw err;
      }

      if (apiError.statusCode) {
        throw apiError;
      }

      const err = new Error(
        'Unable to generate itinerary at this moment. Please check server configuration or try again.'
      );
      err.statusCode = 502;
      throw err;
    }
  }
};

export default geminiService;
