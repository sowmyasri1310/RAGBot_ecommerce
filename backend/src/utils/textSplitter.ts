import { logger } from './logger';

export class TextSplitter {
  /**
   * Splits a long text string into smaller overlapping chunks.
   * Target chunk size: 800 characters, overlap: 120 characters.
   */
  public static split(text: string, chunkSize: number = 800, overlap: number = 120): string[] {
    const cleanedText = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    
    if (cleanedText.length <= chunkSize) {
      return [cleanedText];
    }

    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < cleanedText.length) {
      let endIndex = startIndex + chunkSize;

      if (endIndex >= cleanedText.length) {
        chunks.push(cleanedText.substring(startIndex));
        break;
      }

      // To keep sentences/paragraphs clean, look back for a logical sentence break (., \n, ?, !)
      let breakIndex = -1;
      const scanWindow = cleanedText.substring(endIndex - 80, endIndex);
      
      // Look for a newline first in the window, then periods
      const newlineIdx = scanWindow.lastIndexOf('\n');
      const periodIdx = scanWindow.lastIndexOf('. ');
      const questionIdx = scanWindow.lastIndexOf('? ');

      if (newlineIdx !== -1) {
        breakIndex = endIndex - 80 + newlineIdx + 1;
      } else if (periodIdx !== -1) {
        breakIndex = endIndex - 80 + periodIdx + 2;
      } else if (questionIdx !== -1) {
        breakIndex = endIndex - 80 + questionIdx + 2;
      }

      // If a suitable break point was found, cut there
      if (breakIndex > startIndex + overlap) {
        endIndex = breakIndex;
      }

      const chunk = cleanedText.substring(startIndex, endIndex).trim();
      if (chunk.length > 50) { // Discard exceptionally tiny residual fragments
        chunks.push(chunk);
      }

      // Slide start index back by overlap
      startIndex = endIndex - overlap;
    }

    logger.debug(`TextSplitter split input text of length ${cleanedText.length} into ${chunks.length} chunks.`);
    return chunks;
  }
}
