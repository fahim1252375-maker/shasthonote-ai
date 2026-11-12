/**
 * Citation and Passage Retrieval Helper
 * Checks quote matches against uploaded text; matching does not prove factual accuracy
 */

export interface DocumentChunk {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  pageNumber?: number;
  text: string;
}

export interface CitationReference {
  citationIndex: number;
  chunkId: string;
  documentTitle: string;
  pageNumber?: number;
  exactQuote: string;
  relevanceScore: number;
}

/**
 * Splits document text into manageable, numbered chunks for citation tracking
 */
export function chunkDocumentText(
  documentId: string,
  documentTitle: string,
  fullText: string,
  chunkSize: number = 600,
  overlap: number = 100
): DocumentChunk[] {
  if (!fullText || fullText.trim() === '') return [];

  const safeChunkSize = Math.max(200, Math.min(chunkSize, 12_000));
  const safeOverlap = Math.max(0, Math.min(overlap, Math.floor(safeChunkSize / 3)));
  const chunks: DocumentChunk[] = [];
  let currentChunk = '';
  let chunkIndex = 1;
  let estimatedPage = 1;

  const pushChunk = () => {
    const text = currentChunk.trim();
    if (!text) return;
    chunks.push({
      chunkId: `${documentId}-chunk-${chunkIndex}`,
      documentId,
      documentTitle,
      pageNumber: estimatedPage,
      text,
    });
    chunkIndex += 1;
    currentChunk = text.slice(Math.max(0, text.length - safeOverlap));
  };

  const paragraphs = fullText.split(/\n\s*\n/);
  for (const paragraph of paragraphs) {
    const pageMatch = paragraph.match(/(?:Page|পৃষ্ঠা)\s*(\d+)/i);
    if (pageMatch?.[1]) estimatedPage = Number.parseInt(pageMatch[1], 10) || estimatedPage;

    let remaining = paragraph.trim();
    while (remaining.length > 0) {
      const available = safeChunkSize - currentChunk.length - (currentChunk ? 1 : 0);
      if (available <= 0) {
        pushChunk();
        continue;
      }

      const piece = remaining.slice(0, available);
      currentChunk = currentChunk ? `${currentChunk}\n${piece}` : piece;
      remaining = remaining.slice(piece.length);

      if (remaining.length > 0) pushChunk();
    }

    if (currentChunk.length >= safeChunkSize) pushChunk();
  }

  const finalText = currentChunk.trim();
  if (finalText) {
    chunks.push({
      chunkId: `${documentId}-chunk-${chunkIndex}`,
      documentId,
      documentTitle,
      pageNumber: estimatedPage,
      text: finalText,
    });
  }
  return chunks;
}

/**
 * Validates that an asserted citation actually exists in the source text
 */
export function verifyCitation(quote: string, sourceText: string): boolean {
  if (!quote || quote.trim().length < 5 || !sourceText) return false;
  // Normalize whitespaces for resilient matching
  const cleanQuote = quote.replace(/\s+/g, ' ').trim().toLowerCase();
  const cleanSource = sourceText.replace(/\s+/g, ' ').toLowerCase();
  return cleanSource.includes(cleanQuote);
}

/**
 * Extracts verified citations from a set of available document chunks
 */
export function findMatchingChunks(
  query: string,
  chunks: DocumentChunk[],
  maxResults: number = 3
): CitationReference[] {
  if (!query || query.trim() === '' || chunks.length === 0) return [];

  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const scored = chunks
    .map((chunk) => {
      const textLower = chunk.text.toLowerCase();
      let matchCount = 0;
      for (const term of queryTerms) {
        if (textLower.includes(term)) {
          matchCount++;
        }
      }
      const score = queryTerms.length > 0 ? matchCount / queryTerms.length : 0;
      return { chunk, score };
    })
    .filter((item) => item.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return scored.map((item, index) => {
    // extract preview quote snippet
    const quoteSnippet = item.chunk.text.slice(0, 180) + '...';
    return {
      citationIndex: index + 1,
      chunkId: item.chunk.chunkId,
      documentTitle: item.chunk.documentTitle,
      pageNumber: item.chunk.pageNumber,
      exactQuote: quoteSnippet,
      relevanceScore: Number(item.score.toFixed(2)),
    };
  });
}
