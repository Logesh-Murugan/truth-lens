import fetch from "node-fetch";

interface WikidataResult {
  description: string;
  source: string;
  id: string;
}

/**
 * Search Wikidata for an entity matching the query.
 * Returns the description of the first match, or null.
 * Never throws — returns null on any error.
 */
export async function searchWikidata(
  query: string
): Promise<WikidataResult | null> {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encoded}&language=en&format=json&origin=*`;

    const response = await fetch(url);

    if (!response.ok) {
      console.log("[Wikidata] Request failed:", response.status);
      return null;
    }

    const data = (await response.json()) as any;
    const results = data?.search;

    if (!results || results.length === 0) {
      console.log("[Wikidata] No results found");
      return null;
    }

    const first = results[0];
    const description = first.description || "";

    if (!description) {
      console.log("[Wikidata] No description for first result");
      return null;
    }

    console.log(`[Wikidata] Found: ${first.label} — ${description}`);

    return {
      description,
      source: "Wikidata",
      id: first.id,
    };
  } catch (error) {
    console.error("[Wikidata] Error:", error);
    return null;
  }
}
