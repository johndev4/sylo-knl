/**
 * Query analysis and conversation memory integration for RAG.
 * Analyzes conversation history to:
 * 1. Identify purely conversational messages (greetings, meta-chat questions).
 * 2. Reformulate follow-up questions into standalone semantic queries.
 * 3. Extract relevant tag keywords for tag-based document matching.
 */

import { generateAnswer } from '@/lib/ai/core/llm';

export interface AnalyzedQuery {
  isConversationalOnly: boolean;
  standaloneQuery: string;
  tagKeywords: string[];
}

const COMMON_STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'he',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'that',
  'the',
  'to',
  'was',
  'were',
  'will',
  'with',
  'the',
  'this',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'how',
  'can',
  'could',
  'would',
  'should',
  'about',
  'tell',
  'me',
  'you',
  'your',
  'i',
  'my',
]);

/**
 * Fallback keyword extraction from text when LLM analysis is skipped or fails.
 */
export function extractSimpleKeywords(text: string, max: number = 4): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !COMMON_STOPWORDS.has(w));

  return Array.from(new Set(words)).slice(0, max);
}

const QUERY_ANALYSIS_SYSTEM_PROMPT = `You are a query analysis assistant for a RAG knowledge base.
Analyze the user's latest message in context of the ongoing conversation history.

Tasks:
1. "isConversationalOnly": Set to true IF AND ONLY IF the user's message is a greeting, small talk, pleasantry, acknowledgment, or asking about the conversation itself (e.g. "summarize what we discussed", "repeat your last point", "hello", "thank you") that requires NO external knowledge base document retrieval. If the user asks any factual, topical, or document-related question, set to false.
2. "standaloneQuery": A standalone, clear search query rewritten to resolve pronouns ("it", "they", "the first one", "that project") and conversational references using prior messages, suitable for vector search. If isConversationalOnly is true, provide an empty string.
3. "tagKeywords": Array of 1 to 5 concise, lowercase topic keywords or potential document tags (e.g. ["architecture", "auth", "onboarding"]) extracted from the user's question. If isConversationalOnly is true or no clear topics exist, return an empty array.

Return ONLY a valid JSON object in this exact shape without extra commentary:
{
  "isConversationalOnly": boolean,
  "standaloneQuery": string,
  "tagKeywords": string[]
}`;

/**
 * Analyze the user query with conversation history.
 */
export async function analyzeChatQuery(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<AnalyzedQuery> {
  const latestMessage = messages[messages.length - 1];
  if (!latestMessage || !latestMessage.content.trim()) {
    return {
      isConversationalOnly: true,
      standaloneQuery: '',
      tagKeywords: [],
    };
  }

  const queryText = latestMessage.content.trim();
  const history = messages.slice(0, -1);

  // Quick check for obvious greetings on a fresh session
  if (
    history.length === 0 &&
    /^(hi|hello|hey|greetings|good morning|good afternoon|good evening)[!.]*$/i.test(
      queryText
    )
  ) {
    return {
      isConversationalOnly: true,
      standaloneQuery: '',
      tagKeywords: [],
    };
  }

  try {
    // Format conversation history for analyzer prompt (keeping up to last 8 turns)
    const recentHistory = history.slice(-8).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const analysisInput = [
      ...recentHistory,
      {
        role: 'user' as const,
        content: `Analyze this latest message for RAG retrieval:\n"${queryText}"`,
      },
    ];

    const response = await generateAnswer(
      QUERY_ANALYSIS_SYSTEM_PROMPT,
      analysisInput,
      {
        temperature: 0.1,
        maxTokens: 250,
      }
    );

    // Strip markdown code fences if returned by LLM
    const cleaned = response
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    return {
      isConversationalOnly: Boolean(parsed.isConversationalOnly),
      standaloneQuery:
        typeof parsed.standaloneQuery === 'string' &&
        parsed.standaloneQuery.trim().length > 0
          ? parsed.standaloneQuery.trim()
          : queryText,
      tagKeywords: Array.isArray(parsed.tagKeywords)
        ? parsed.tagKeywords
            .filter(
              (t: unknown) => typeof t === 'string' && t.trim().length > 0
            )
            .map((t: string) => t.trim().toLowerCase())
        : extractSimpleKeywords(queryText),
    };
  } catch (error) {
    console.warn(
      '[QUERY ANALYZER] Analysis failed or timed out, using fallback:',
      error
    );
    return {
      isConversationalOnly: false,
      standaloneQuery: queryText,
      tagKeywords: extractSimpleKeywords(queryText),
    };
  }
}
