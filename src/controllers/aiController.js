import geminiService from '../services/geminiService.js';
import { validateItineraryRequest } from '../utils/itineraryValidation.js';

export const aiController = {
  /**
   * POST /api/ai/chat
   * Conversational chat endpoint with Gemini Travel Assistant
   */
  async chat(req, res, next) {
    try {
      const { message, conversation, context } = req.body;

      // 1. Validate user message presence and type
      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Message field is required and cannot be empty.'
        });
      }

      const trimmedMessage = message.trim();

      // 2. Validate max message length (prevent payload abuse)
      if (trimmedMessage.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Message is too long. Please limit your prompt to 1,000 characters.'
        });
      }

      // 3. Validate optional conversation history structure
      let safeConversation = [];
      if (conversation !== undefined) {
        if (!Array.isArray(conversation)) {
          return res.status(400).json({
            success: false,
            message: 'Conversation history must be an array.'
          });
        }
        if (conversation.length > 20) {
          safeConversation = conversation.slice(-20);
        } else {
          safeConversation = conversation;
        }
      }

      // 4. Validate context object
      const safeContext = (context && typeof context === 'object' && !Array.isArray(context))
        ? context
        : {};

      // 5. Query Gemini Service
      const result = await geminiService.generateTravelAdvice({
        message: trimmedMessage,
        conversation: safeConversation,
        context: safeContext
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/ai/itinerary
   * Generates a structured day-by-day travel plan using Gemini
   */
  async generateItinerary(req, res, next) {
    try {
      // 1. Validate incoming request parameters
      const validation = validateItineraryRequest(req.body);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: validation.error
        });
      }

      // 2. Call Gemini Itinerary Service
      const itineraryData = await geminiService.generateItinerary(validation.data);

      return res.status(200).json({
        success: true,
        data: itineraryData
      });
    } catch (error) {
      next(error);
    }
  }
};

export default aiController;
