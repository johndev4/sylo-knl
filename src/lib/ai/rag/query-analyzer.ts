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
  isUserCorrection: boolean;
  correctionSearchQuery: string;
  isConversationalOnly: boolean;
  needsClarification: boolean;
  clarificationQuestion: string;
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
2. "isOutOfScope": Set to true only when the user explicitly requests external general knowledge or an unrelated task (e.g., recipes, weather, celebrity gossip, unrelated general news, or writing code from scratch). A short factual question or a question about a named subject is NOT automatically out of scope: assume it may refer to the selected library and allow retrieval to check. Set to false if isDocumentActionRequest is true or if it asks about documents/topics/facts in their libraries, including broad library overviews and key takeaways, asks about using Sylo/library chat, or is conversational dialogue.
3. "isUserCorrection": Set to true ONLY when ALL of the following hold:
   - isDocumentActionRequest and isOutOfScope are both false.
   - The user's latest message contradicts, disputes, or corrects a specific factual claim that the assistant made earlier in this conversation (e.g., "episode 195 was aired July not June", "it was July not June", "actually the date is X", "you're wrong, it's Y", "no, that's incorrect").
   - The conversation history clearly establishes the subject and fact being disputed (e.g. prior assistant turn already mentioned "Episode 195 of Detective Conan aired on June 19, 2000").
   - If there is no prior assistant factual claim being disputed in the conversation history, set this to false.
4. "correctionSearchQuery": When isUserCorrection is true, provide a concise standalone search query designed to retrieve the true facts about the disputed item from the libraries (e.g., "Detective Conan episode 195 air date"). Otherwise return an empty string.
5. "isConversationalOnly": Set to true IF AND ONLY IF the user's message is a greeting, small talk, pleasantry, acknowledgment, question about how to use Sylo, or asking about the conversation history itself (e.g. "summarize what we discussed", "repeat your last point", "hello", "thank you") that requires NO external knowledge base document retrieval. Questions asking for summaries, main topics, or key takeaways from library documents require retrieval and are NOT conversational-only. If isDocumentActionRequest, isOutOfScope, or isUserCorrection is true, set this to false.
6. "needsClarification": Set to true ONLY when ALL of the following are true:
   - isDocumentActionRequest, isOutOfScope, isUserCorrection, and isConversationalOnly are all false.
   - The question contains a specific entity or reference (e.g. an episode number, a chapter, a character name fragment, a product SKU, a date) that cannot be resolved to a subject/topic/series without additional context.
   - The conversation history does NOT already establish the missing subject (e.g. if a prior assistant message already identified the show, needsClarification must be false).
   - The query is NOT a broad library overview request (e.g. "What is this library about?" or "List all documents") — those proceed to retrieval even without a named subject.
   - If the user's latest message looks like a direct answer to a clarifying question the assistant just asked (e.g. a single proper noun reply such as "Naruto" or "Detective Conan" after the assistant asked which show they meant), set needsClarification to false.
7. "clarificationQuestion": When needsClarification is true, provide a concise description of exactly what missing context is needed so the pipeline can ask the user (e.g. "Which show, series, or topic does episode 195 belong to?"). Otherwise return an empty string.
8. "standaloneQuery": A standalone, clear search query rewritten to resolve pronouns ("it", "they", "the first one", "that project") and conversational references using prior messages, suitable for vector search. When the user's latest message answers a prior clarifying question from the assistant, merge the original question and the clarification into one complete query here. If isUserCorrection is true, provide the correctionSearchQuery here as well. If isDocumentActionRequest, isConversationalOnly, isOutOfScope, or needsClarification is true, provide an empty string.
9. "tagKeywords": Array of 1 to 5 concise, lowercase topic keywords or potential document tags (e.g. ["architecture", "auth", "onboarding"]) extracted from the user's question or disputed subject. If isDocumentActionRequest, isConversationalOnly, isOutOfScope, or needsClarification is true or no clear topics exist, return an empty array.

Return ONLY a valid JSON object in this exact shape without extra commentary:
{
  "isDocumentActionRequest": boolean,
  "isOutOfScope": boolean,
  "isUserCorrection": boolean,
  "correctionSearchQuery": string,
  "isConversationalOnly": boolean,
  "needsClarification": boolean,
  "clarificationQuestion": string,
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
      isUserCorrection: false,
      correctionSearchQuery: '',
      isConversationalOnly: true,
      needsClarification: false,
      clarificationQuestion: '',
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
      isUserCorrection: false,
      correctionSearchQuery: '',
      isConversationalOnly: false,
      needsClarification: false,
      clarificationQuestion: '',
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
      isUserCorrection: false,
      correctionSearchQuery: '',
      isConversationalOnly: true,
      needsClarification: false,
      clarificationQuestion: '',
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
    const isUserCorrection =
      !isDocumentActionRequest &&
      !isOutOfScope &&
      Boolean(parsed.isUserCorrection);
    const correctionSearchQuery =
      isUserCorrection &&
      typeof parsed.correctionSearchQuery === 'string' &&
      parsed.correctionSearchQuery.trim().length > 0
        ? parsed.correctionSearchQuery.trim()
        : '';
    const isConversationalOnly =
      !isDocumentActionRequest &&
      !isOutOfScope &&
      !isUserCorrection &&
      Boolean(parsed.isConversationalOnly);
    const isSpecialBranch =
      isDocumentActionRequest ||
      isOutOfScope ||
      isUserCorrection ||
      isConversationalOnly;
    const needsClarification =
      !isSpecialBranch && Boolean(parsed.needsClarification);
    const isAnySpecialBranch = isSpecialBranch || needsClarification;

    const standaloneQuery = isUserCorrection
      ? correctionSearchQuery || queryText
      : !isAnySpecialBranch &&
          typeof parsed.standaloneQuery === 'string' &&
          parsed.standaloneQuery.trim().length > 0
        ? parsed.standaloneQuery.trim()
        : isAnySpecialBranch
          ? ''
          : queryText;

    return {
      isDocumentActionRequest,
      isOutOfScope,
      isUserCorrection,
      correctionSearchQuery,
      isConversationalOnly,
      needsClarification,
      clarificationQuestion:
        needsClarification &&
        typeof parsed.clarificationQuestion === 'string' &&
        parsed.clarificationQuestion.trim().length > 0
          ? parsed.clarificationQuestion.trim()
          : '',
      standaloneQuery,
      tagKeywords:
        !isAnySpecialBranch || isUserCorrection
          ? Array.isArray(parsed.tagKeywords) && parsed.tagKeywords.length > 0
            ? parsed.tagKeywords
                .filter(
                  (t: unknown) => typeof t === 'string' && t.trim().length > 0
                )
                .map((t: string) => t.trim().toLowerCase())
            : extractSimpleKeywords(standaloneQuery || queryText)
          : [],
    };
  } catch {
    logger.warn('Chat query analysis failed; using the original query');
    return {
      isDocumentActionRequest: false,
      isOutOfScope: false,
      isUserCorrection: false,
      correctionSearchQuery: '',
      isConversationalOnly: false,
      needsClarification: false,
      clarificationQuestion: '',
      standaloneQuery: queryText,
      tagKeywords: extractSimpleKeywords(queryText),
    };
  }
}
