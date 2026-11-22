/**
 * Query analysis and conversation memory integration for RAG.
 * Analyzes conversation history to:
 * 1. Detect document creation/modification requests (prompting to use Library Document Editor).
 * 2. Detect out-of-scope requests (unrelated general knowledge, external tasks).
 * 3. Identify purely conversational messages (greetings, meta-chat questions, Sylo help).
 * 4. Reformulate follow-up questions into standalone semantic queries.
 * 5. Extract relevant tag keywords for tag-based document matching.
 */

import { generateAnswer } from '@/lib/ai/core/llm';
import { logger } from '@/lib/logging/logger';

export interface AnalyzedQuery {
  isDocumentActionRequest: boolean;
  isOutOfScope: boolean;
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
1. "isDocumentActionRequest": Set to true IF the user's message is asking to create a document, add or save content as a document, insert information into a document, or update an existing document in a library (e.g. "Create a document called X", "Add this note to the library", "Save our conversation as a document", "Insert this section into doc Y").
2. "isOutOfScope": Set to true IF the user's message is asking for external general knowledge (e.g., world trivia, recipes, weather, celebrity gossip, unrelated general news), asking to write code or essays from scratch unrelated to the user's libraries, or asking to perform external tasks outside of Sylo. Set to false if isDocumentActionRequest is true or if it asks about documents/topics/facts in their libraries, including broad library overviews and key takeaways, asks about using Sylo/library chat, or is conversational dialogue.
3. "isConversationalOnly": Set to true IF AND ONLY IF the user's message is a greeting, small talk, pleasantry, acknowledgment, question about how to use Sylo, or asking about the conversation history itself (e.g. "summarize what we discussed", "repeat your last point", "hello", "thank you") that requires NO external knowledge base document retrieval. Questions asking for summaries, main topics, or key takeaways from library documents require retrieval and are NOT conversational-only. If isDocumentActionRequest or isOutOfScope is true, set this to false.
4. "standaloneQuery": A standalone, clear search query rewritten to resolve pronouns ("it", "they", "the first one", "that project") and conversational references using prior messages, suitable for vector search. If isDocumentActionRequest, isConversationalOnly, or isOutOfScope is true, provide an empty string.
5. "tagKeywords": Array of 1 to 5 concise, lowercase topic keywords or potential document tags (e.g. ["architecture", "auth", "onboarding"]) extracted from the user's question. If isDocumentActionRequest, isConversationalOnly, or isOutOfScope is true or no clear topics exist, return an empty array.

Return ONLY a valid JSON object in this exact shape without extra commentary:
{
  "isDocumentActionRequest": boolean,
  "isOutOfScope": boolean,
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
      isDocumentActionRequest: false,
      isOutOfScope: false,
      isConversationalOnly: true,
      standaloneQuery: '',
      tagKeywords: [],
    };
  }

  const queryText = latestMessage.content.trim();
  const history = messages.slice(0, -1);

  if (
    history.length === 0 &&
    /\b(?:library|libraries|documents?)\b/i.test(queryText) &&
    /\b(?:mainly about|main topics?|(?:key|important) takeaways)\b/i.test(
      queryText
    )
  ) {
    return {
      isDocumentActionRequest: false,
      isOutOfScope: false,
      isConversationalOnly: false,
      standaloneQuery: queryText,
      tagKeywords: [],
    };
  }

  // Quick check for obvious greetings on a fresh session
  if (
    history.length === 0 &&
    /^(hi|hello|hey|greetings|good morning|good afternoon|good evening)[!.]*$/i.test(
      queryText
    )
  ) {
    return {
      isDocumentActionRequest: false,
      isOutOfScope: false,
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

    const isDocumentActionRequest = Boolean(parsed.isDocumentActionRequest);
    const isOutOfScope =
      !isDocumentActionRequest && Boolean(parsed.isOutOfScope);
    const isConversationalOnly =
      !isDocumentActionRequest &&
      !isOutOfScope &&
      Boolean(parsed.isConversationalOnly);
    const isSpecialBranch =
      isDocumentActionRequest || isOutOfScope || isConversationalOnly;

    return {
      isDocumentActionRequest,
      isOutOfScope,
      isConversationalOnly,
      standaloneQuery:
        !isSpecialBranch &&
        typeof parsed.standaloneQuery === 'string' &&
        parsed.standaloneQuery.trim().length > 0
          ? parsed.standaloneQuery.trim()
          : isSpecialBranch
            ? ''
            : queryText,
      tagKeywords:
        !isSpecialBranch && Array.isArray(parsed.tagKeywords)
          ? parsed.tagKeywords
              .filter(
                (t: unknown) => typeof t === 'string' && t.trim().length > 0
              )
              .map((t: string) => t.trim().toLowerCase())
          : isSpecialBranch
            ? []
            : extractSimpleKeywords(queryText),
    };
  } catch {
    logger.warn('Chat query analysis failed; using the original query');
    return {
      isDocumentActionRequest: false,
      isOutOfScope: false,
      isConversationalOnly: false,
      standaloneQuery: queryText,
      tagKeywords: extractSimpleKeywords(queryText),
    };
  }
}
