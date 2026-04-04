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
 * Compare a claim against source excerpts and return a verdict.
 */
export async function compareClaimWithSources(
  sentence: string,
  sources: any[]
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

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            'You are a fact-checker. Compare the claim against the source excerpts provided, but also use your internal knowledge of established medical guidelines and scientific consensus if the sources are insufficient. Respond ONLY with valid JSON, no markdown. Format: {"result": "green" or "yellow" or "red", "reason": "one sentence explanation under 120 characters"}. green = claim is factually correct. red = claim contradicts medical guidelines or established facts. yellow = claim is unclear or unable to be verified.',
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
