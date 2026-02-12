export async function webSearch(query: string, maxResults: number) {
  return {
    query,
    maxResults,
    results: [],
    note: "web_search is not configured. Wire a real search provider in packages/tools/webSearch.ts",
  };
}
