export type SearchResultKind = "lead" | "client" | "contact";

export interface SearchResult {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle: string | null;
  href: string;
}

export interface SearchResponse {
  success: true;
  results: SearchResult[];
}
