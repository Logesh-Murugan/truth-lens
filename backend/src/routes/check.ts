import { Router, Request, Response } from "express";
import { isFactualClaim, compareClaimWithSources } from "../services/groq";
import { searchWikipedia } from "../services/wikipedia";
import { searchPubMedMedical } from "../services/pubmed";
import { getCached, setCached } from "../db/cache";

const router: Router = Router();

let lastGroqCallTime = 0;
const MIN_GROQ_INTERVAL_MS = 2000;

async function waitForGroqSlot() {
  const now = Date.now();
  const timeSinceLastCall = now - lastGroqCallTime;
  if (timeSinceLastCall < MIN_GROQ_INTERVAL_MS) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_GROQ_INTERVAL_MS - timeSinceLastCall)
    );
  }
  lastGroqCallTime = Date.now();
}

/**
 * Keyword-based relevance filter: checks if at least 2 key words
 * from the claim appear in the source text.
 */
function isSourceRelevant(claim: string, sourceText: string): boolean {
  if (!sourceText || sourceText.length < 20) return false;

  const claimWords = claim.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 4)
    .map(w => w.replace(/[^a-z]/g, ''))
    .filter(w => w.length > 4);

  if (claimWords.length === 0) return false;

  const sourceTextLower = sourceText.toLowerCase();
  const matchCount = claimWords.filter(w => sourceTextLower.includes(w)).length;

  return matchCount >= 2;
}

router.post("/check", async (req: Request, res: Response) => {
  try {
    const { sentence } = req.body;

    // Validate input
    if (!sentence || typeof sentence !== "string" || sentence.trim().length < 10) {
      res.status(400).json({
        result: "yellow",
        reason: "Invalid input — sentence must be at least 10 characters.",
      });
      return;
    }

    const trimmed = sentence.trim();
    console.log(`\n[TruthLens] Checking: "${trimmed}"`);

    // Step 0: Check Database Cache First
    const cachedEntry = await getCached(trimmed);
    if (cachedEntry) {
      console.log(`[TruthLens] Cache hit! Returning instant verdict.`);
      res.json({ ...cachedEntry, cached: true });
      return;
    }

    await waitForGroqSlot();

    // Step 1: Determine if this is a factual claim
    const claimResult = await isFactualClaim(trimmed);
    console.log(`[TruthLens] Claim detection:`, claimResult);

    if (!claimResult.isClaim) {
      res.json({
        result: "grey",
        reason: "Not a factual claim — no verification needed.",
      });
      return;
    }

    // Step 2: Search sources in parallel
    const [wikiResult, pubmedResult] = await Promise.allSettled([
      searchWikipedia(trimmed),
      searchPubMedMedical(trimmed, claimResult.claimType),
    ]);

    const sources: any[] = [];
    if (wikiResult.status === "fulfilled" && wikiResult.value) {
      sources.push(wikiResult.value);
    }
    if (pubmedResult.status === "fulfilled" && pubmedResult.value) {
      sources.push(pubmedResult.value);
    }

    console.log(`[TruthLens] Found ${sources.length} source(s)`);

    // FIX 2: Filter out irrelevant sources before comparison
    const relevantSources = sources.filter(s => {
      const text = s?.summary || s?.abstract || '';
      const relevant = isSourceRelevant(trimmed, text);
      if (!relevant) {
        console.log(`[TruthLens] Filtered out irrelevant source: ${s?.source}`);
      }
      return relevant;
    });

    console.log(`[TruthLens] ${relevantSources.length} relevant source(s) after filtering`);

    // If no relevant sources remain, return yellow immediately
    if (relevantSources.length === 0) {
      const yellowVerdict = {
        result: 'yellow',
        reason: 'No relevant sources found to verify this claim.',
        sources: [] as string[],
      };
      await setCached(trimmed, yellowVerdict.result, yellowVerdict.reason, yellowVerdict.sources, claimResult.claimType);
      res.json({ ...yellowVerdict, cached: false });
      return;
    }

    // Step 3: Compare claim with RELEVANT sources only using Groq
    const verdict = await compareClaimWithSources(trimmed, relevantSources);
    console.log(`[TruthLens] Verdict:`, verdict);

    // Step 4: Persist to Cache before returning
    await setCached(trimmed, verdict.result, verdict.reason, verdict.sources, claimResult.claimType);

    res.json({ ...verdict, cached: false });
  } catch (error) {
    console.error("[TruthLens] Error:", error);
    res.status(500).json({
      result: "yellow",
      reason: "Verification temporarily unavailable.",
    });
  }
});

export default router;
