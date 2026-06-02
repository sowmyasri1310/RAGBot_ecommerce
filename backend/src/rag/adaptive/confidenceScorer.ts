import { GroqService } from '../../services/groq.service';
import { logger } from '../../utils/logger';

export interface ConfidenceResult {
  confidenceScore: number; // 0.0 to 1.0
  explanation: string;
}

export class ConfidenceScorer {
  /**
   * Evaluates the factual alignment and confidence of a generated answer using Groq.
   */
  public static async compute(
    query: string,
    context: string,
    answer: string
  ): Promise<ConfidenceResult> {
    // If no context was provided or matched, return a low confidence immediately
    if (context.includes('NO RELEVANT KNOWLEDGE CONTEXT FOUND')) {
      return {
        confidenceScore: 0.1,
        explanation: 'No relevant search context matches were found in the product database to support this query.'
      };
    }

    const systemPrompt = `You are a critical quality control agent for an E-commerce Product Assistant.
Your task is to evaluate the correctness, factual grounding, and confidence of a generated chatbot response.
Analyze these three elements:
1. User Query: What the customer asked.
2. Retrieved Context: The factual documents retrieved from the vector database.
3. Generated Answer: The response the chatbot drafted.

Judge the Generated Answer based on:
- Factual grounding: Is every detail in the answer directly supported by the retrieved context? Are there hallucinations?
- Completeness: Does the answer address all aspects of the user query using the facts?
- Ambiguity: Is the answer confident, or does it include hesitations?

You MUST respond with a JSON object containing these keys:
- "confidenceScore": Float between 0.0 and 1.0 indicating how grounded and complete the answer is.
- "explanation": Brief 1-sentence explanation of the score.

Ensure the output is valid JSON and nothing else.`;

    const userPrompt = `User Query: "${query}"

Retrieved Context:
"""
${context}
"""

Generated Answer:
"""
${answer}
"""`;

    try {
      logger.info('Calculating generated response confidence score...');
      const rawJson = await GroqService.chatCompletion(systemPrompt, userPrompt, {
        temperature: 0.0,
        responseFormatJson: true
      });

      const parsed = JSON.parse(rawJson);
      
      const score = parsed.confidenceScore !== undefined ? Number(parsed.confidenceScore) : 0.85;
      const explanation = parsed.explanation || 'Calculated based on context grounding assessment.';

      logger.info(`Response confidence evaluation: ${(score * 100).toFixed(1)}%`);
      return {
        confidenceScore: score,
        explanation
      };
    } catch (error) {
      logger.error('Error calculating confidence score:', error);
      return {
        confidenceScore: 0.75,
        explanation: 'Failsafe default due to score computation error.'
      };
    }
  }
}
