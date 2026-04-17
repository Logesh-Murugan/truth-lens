import fetch from "node-fetch";

interface PubMedResult {
  abstract: string;
  source: string;
  id: string;
}

/**
 * Search PubMed for scientific/medical articles related to the query.
 * Only searches if claimType is medical or scientific.
 * Will retry with parsed shorter queries if no results are found.
 */
export async function searchPubMedMedical(
  query: string,
  claimType: string
): Promise<PubMedResult | null> {
  if (claimType !== "medical" && claimType !== "scientific") {
    console.log(`[PubMed] Skipping non-medical claim (type: ${claimType})`);
    return null;
  }
  try {
    // Fallback search logic: remove common filler words
    const queriesToTry = [
      query,
      query.split(" ").filter(w => w.length > 4).join(" "), // basic keyword extraction
    ];

    let articleId = null;

    for (const attemptQuery of queriesToTry) {
      if (!attemptQuery.trim()) continue;
      
      const encoded = encodeURIComponent(attemptQuery);
      const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encoded}&retmax=1&retmode=json`;
      
      const searchResponse = await fetch(searchUrl, {
        headers: { 'User-Agent': 'TruthLens/1.0 (truthlens@student.edu)' }
      });

      if (!searchResponse.ok) continue;

      const searchData = (await searchResponse.json()) as any;
      const idList = searchData?.esearchresult?.idlist;

      if (idList && idList.length > 0) {
        articleId = idList[0];
        break; // found it
      }
    }

    if (!articleId) {
      console.log("[PubMed] No results found after attempts");
      return null;
    }

    // Step 2: Fetch the article abstract
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${articleId}&rettype=abstract&retmode=text`;
    const fetchResponse = await fetch(fetchUrl, {
      headers: { 'User-Agent': 'TruthLens/1.0 (truthlens@student.edu)' }
    });

    if (!fetchResponse.ok) {
      console.log("[PubMed] Fetch request failed:", fetchResponse.status);
      return null;
    }

    const abstractText = await fetchResponse.text();

    if (!abstractText || abstractText.trim().length === 0) {
      console.log("[PubMed] Empty abstract");
      return null;
    }

    // Limit to 800 characters
    const trimmed =
      abstractText.length > 800
        ? abstractText.substring(0, 800) + "..."
        : abstractText;

    console.log(`[PubMed] Found article ID ${articleId}: "${trimmed.substring(0, 80)}..."`);

    return {
      abstract: trimmed,
      source: "PubMed",
      id: articleId,
    };
  } catch (error) {
    console.error("[PubMed] Error:", error);
    return null;
  }
}
