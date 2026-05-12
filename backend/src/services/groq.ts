import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = "llama-3.3-70b-versatile";

/**
 * Detect whether a sentence is a verifiable factual claim.
 */
export async function isFactualClaim(
  sentence: string
): Promise<{ isClaim: boolean; claimType: string }> {
  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            'You are a claim detector. Respond ONLY with valid JSON, no markdown, no explanation. Format: {"isClaim": true or false, "claimType": "medical" or "scientific" or "historical" or "legal" or "general" or "none"}. isClaim is true ONLY if the sentence makes a specific verifiable factual claim such as a statistic, dosage, date, scientific finding, or legal ruling. isClaim is false for opinions, questions, greetings, instructions, or vague general statements.',
        },
        {
          role: "user",
          content: sentence,
        },
      ],
      temperature: 0,
      max_tokens: 100,
    });

    const text = completion.choices[0]?.message?.content?.trim() || "";
    console.log(`[Groq] Claim detection raw response: ${text}`);

    // Strip markdown code fences if present
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      isClaim: Boolean(parsed.isClaim),
      claimType: parsed.claimType || "none",
    };
  } catch (error) {
    console.error("[Groq] Claim detection error:", error);
    return { isClaim: false, claimType: "none" };
  }
}

/**
 * Quick relevance pre-check: determines if a source is even about the same topic
 * as the claim before doing a full comparison. Prevents false RED from irrelevant sources.
 */
export async function quickRelevanceCheck(
  claim: string,
  sourceText: string
): Promise<boolean> {
  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'Answer only with true or false. No other text.'
        },
        {
          role: 'user',
          content: `Is this source text relevant to fact-checking this claim?\nCLAIM: ${claim}\nSOURCE (first 200 chars): ${sourceText.slice(0, 200)}\nAnswer true if the source is about the same topic as the claim.\nAnswer false if the source is about a completely different topic.`
        }
      ],
      temperature: 0,
      max_tokens: 5,
    });

    const answer = response.choices[0]?.message?.content?.toLowerCase() || 'false';
    const isRelevant = answer.includes('true');
    console.log(`[Groq] Relevance check: ${isRelevant ? 'RELEVANT' : 'NOT RELEVANT'}`);
    return isRelevant;
  } catch (error) {
    console.error('[Groq] Relevance check error:', error);
    return true; // default to relevant on error to avoid blocking
  }
}

/**
 * Compare a claim against source excerpts and return a verdict.
 * Uses different prompts for medical/scientific vs general/historical claims.
 */
export async function compareClaimWithSources(
  sentence: string,
  sources: any[],
  claimType: string = "general"
): Promise<{ result: string; reason: string; sources: string[] }> {
  // Build source text (max 1500 characters)
  let sourceText = "";
  const sourceNames: string[] = [];

  for (const src of sources) {
    const snippet = src.summary || src.abstract || src.description || "";
    const name = src.source || "Unknown";
    sourceNames.push(name);

    const entry = `[${name}]: ${snippet}\n\n`;
    if (sourceText.length + entry.length <= 1500) {
      sourceText += entry;
    }
  }

  if (!sourceText.trim()) {
    return {
      result: "yellow",
      reason: "No sources found to verify this claim.",
      sources: [],
    };
  }

  const isMedicalOrScientific = claimType === 'medical' || claimType === 'scientific';

  // FIX 3: Only run quickRelevanceCheck for general/historical claims
  if (!isMedicalOrScientific) {
    const isRelevant = await quickRelevanceCheck(sentence, sourceText);
    if (!isRelevant) {
      console.log('[Groq] Sources deemed irrelevant — returning yellow instead of risking false red');
      return {
        result: "yellow",
        reason: "Sources found were not relevant to this specific claim.",
        sources: sourceNames,
      };
    }
  } else {
    console.log('[Groq] Medical/scientific claim — skipping relevance pre-check');
  }

  // FIX 2: Select prompt based on claim type
  const medicalPrompt =
    'You are a medical and scientific fact-checker with expert knowledge. Compare the claim against the sources provided AND your own training knowledge about medicine and science. RULES: - For medical claims: use your knowledge of WHO guidelines, medical consensus, and established research — even if sources are weak. - Return RED if the claim is medically dangerous or scientifically false based on your knowledge. - Return GREEN if the claim matches established medical/scientific consensus. - Return YELLOW only if genuinely uncertain. Examples you must get right: - Aspirin for children under 12 → RED (causes Reye\'s syndrome, WHO contraindicated). - Ibuprofen 400mg for adults → GREEN (standard dosage). - Vaccines cause autism → RED (scientifically disproven). - Water boils at 100C → GREEN (established fact). Respond ONLY with valid JSON, no markdown. Format: {"result": "green" or "yellow" or "red", "reason": "one sentence under 100 characters"}';

  const generalPrompt =
    'You are a careful fact-checker. Compare the claim against the source excerpts provided. CRITICAL RULES: - Return RED only if the source DIRECTLY and EXPLICITLY contradicts the claim with clear opposing information. - If the source is about a different topic than the claim, return YELLOW — never RED. - If the source partially supports or is unrelated, return YELLOW. - Only return GREEN if the source clearly and directly confirms the specific claim. - When in doubt between RED and YELLOW, always choose YELLOW. - A source about a different subject cannot contradict a claim. Respond ONLY with valid JSON, no markdown. Format: {"result": "green" or "yellow" or "red", "reason": "one sentence under 100 characters"}';

  const systemPrompt = isMedicalOrScientific ? medicalPrompt : generalPrompt;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `CLAIM: "${sentence}"\n\nSOURCES:\n${sourceText}`,
        },
      ],
      temperature: 0,
      max_tokens: 150,
    });

    const text = completion.choices[0]?.message?.content?.trim() || "";
    console.log(`[Groq] Fact-check raw response: ${text}`);

    const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      result: parsed.result || "yellow",
      reason: parsed.reason || "Unable to determine verdict.",
      sources: sourceNames,
    };
  } catch (error) {
    console.error("[Groq] Fact-check error:", error);
    return {
      result: "yellow",
      reason: "Error comparing claim with sources.",
      sources: sourceNames,
    };
  }
}
