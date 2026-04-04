import { Router, Request, Response } from "express";
import { isFactualClaim, compareClaimWithSources } from "../services/groq";
import { searchWikipedia } from "../services/wikipedia";
import { searchPubMed } from "../services/pubmed";

const router = Router();

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
      searchPubMed(trimmed),
    ]);

    const sources: any[] = [];
    if (wikiResult.status === "fulfilled" && wikiResult.value) {
      sources.push(wikiResult.value);
    }
    if (pubmedResult.status === "fulfilled" && pubmedResult.value) {
      sources.push(pubmedResult.value);
    }

    console.log(`[TruthLens] Found ${sources.length} source(s)`);

    // Step 3: Compare claim with sources using Groq
    const verdict = await compareClaimWithSources(trimmed, sources);
    console.log(`[TruthLens] Verdict:`, verdict);

    res.json(verdict);
  } catch (error) {
    console.error("[TruthLens] Error:", error);
    res.status(500).json({
      result: "yellow",
      reason: "Verification temporarily unavailable.",
    });
  }
});

export default router;
