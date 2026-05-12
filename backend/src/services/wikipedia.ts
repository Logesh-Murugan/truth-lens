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

const FILLER_WORDS = new Set([
  'the','a','an','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','could',
  'should','may','might','shall','can','need','dare','ought',
  'used','able','at','in','on','of','for','to','from','by',
  'with','and','but','or','nor','so','yet','both','either',
  'this','that','these','those','it','its','which','when',
  'also','equal','means','known','all','forms','normal',
  'approximately','about','around','nearly','roughly',
  'just','only','very','quite','rather','somewhat',
  'therefore','however','although','because','since',
  'often','usually','generally','typically','commonly'
]);

function extractSearchQuery(sentence: string): string {
  let query = sentence
    .replace(/\d+[°℃℉]\s*[=≈]\s*\d+[°℃℉]/g, '')  // remove temp conversions
    .replace(/[=≈<>±×÷]/g, ' ')                      // remove math symbols
    .replace(/\d+,\d+/g, match => match.replace(',','')) // normalize numbers
    .replace(/[^\w\s]/g, ' ')                          // remove special chars
    .toLowerCase();

  const words = query.split(/\s+/)
    .filter(w => w.length > 3 && !FILLER_WORDS.has(w))
    .slice(0, 5);

  return words.join(' ');
}

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
      // Fall back to search API with cleaned query
      await new Promise(resolve => setTimeout(resolve, 500));
      const cleanedQuery = extractSearchQuery(query);
      console.log(`[Wikipedia] Fallback search query: "${cleanedQuery}"`);
      const searchEncoded = encodeURIComponent(cleanedQuery);
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${searchEncoded}&format=json&srlimit=1&origin=*`;
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
