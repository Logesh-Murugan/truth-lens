import fetch from "node-fetch";

interface WikipediaResult {
  summary: string;
  source: string;
  url: string;
}

/**
 * Search Wikipedia for information related to the query.
 * First tries a direct page summary, then falls back to search.
 * Never throws — returns null on any error.
 */
export async function searchWikipedia(
  query: string
): Promise<WikipediaResult | null> {
  try {
    // Try direct page summary first
    const encoded = encodeURIComponent(query);
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;

    let response = await fetch(summaryUrl, {
      headers: {
        'User-Agent': 'TruthLens/1.0 (student project, contact: student@email.com)',
        'Api-User-Agent': 'TruthLens/1.0'
      }
    });

    if (response.status === 404) {
      // Fall back to search API
      await new Promise(resolve => setTimeout(resolve, 500));
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&format=json&srlimit=1&origin=*`;
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'TruthLens/1.0 (student project, contact: student@email.com)',
          'Api-User-Agent': 'TruthLens/1.0'
        }
      });

      if (!searchResponse.ok) {
        console.log("[Wikipedia] Search request failed:", searchResponse.status);
        return null;
      }

      const searchData = (await searchResponse.json()) as any;
      const results = searchData?.query?.search;

      if (!results || results.length === 0) {
        console.log("[Wikipedia] No search results found");
        return null;
      }

      // Fetch summary for the first search result
      const title = encodeURIComponent(results[0].title);
      const resultSummaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`;
      await new Promise(resolve => setTimeout(resolve, 500));
      response = await fetch(resultSummaryUrl, {
        headers: {
          'User-Agent': 'TruthLens/1.0 (student project, contact: student@email.com)',
          'Api-User-Agent': 'TruthLens/1.0'
        }
      });
    }

    if (!response.ok) {
      console.log("[Wikipedia] Summary request failed:", response.status);
      return null;
    }

    const data = (await response.json()) as any;
    const extract = data.extract || "";

    if (!extract) {
      console.log("[Wikipedia] No extract found");
      return null;
    }

    const summary = extract.length > 500 ? extract.substring(0, 500) + "..." : extract;
    const url = data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${data.title}`;

    console.log(`[Wikipedia] Found: "${summary.substring(0, 80)}..."`);

    return {
      summary,
      source: "Wikipedia",
      url,
    };
  } catch (error) {
    console.error("[Wikipedia] Error:", error);
    return null;
  }
}
