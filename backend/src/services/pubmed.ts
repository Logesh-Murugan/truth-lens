import fetch from "node-fetch";

interface PubMedResult {
  abstract: string;
  source: string;
  id: string;
}

/**
 * Search PubMed for scientific articles related to the query.
 * Never throws — returns null on any error.
 */
export async function searchPubMed(
  query: string
): Promise<PubMedResult | null> {
  try {
    const encoded = encodeURIComponent(query);

    // Step 1: Search for article IDs
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encoded}&retmax=1&retmode=json`;
    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) {
      console.log("[PubMed] Search request failed:", searchResponse.status);
      return null;
    }

    const searchData = (await searchResponse.json()) as any;
    const idList = searchData?.esearchresult?.idlist;

    if (!idList || idList.length === 0) {
      console.log("[PubMed] No results found");
      return null;
    }

    const articleId = idList[0];

    // Step 2: Fetch the article abstract
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${articleId}&rettype=abstract&retmode=text`;
    const fetchResponse = await fetch(fetchUrl);

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
