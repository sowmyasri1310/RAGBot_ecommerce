import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { DBService, DocumentRecord } from './db.service';
import { EmbeddingService } from './embedding.service';
import { ChromaDBService } from './chromadb.service';
import { MetadataFilterService } from './metadataFilter.service';
import { TextSplitter } from '../utils/textSplitter';
import { logger } from '../utils/logger';

export class DocumentService {
  /**
   * Processes an uploaded file: extracts text, chunks it, generates embeddings,
   * inserts into ChromaDB, and registers document metadata.
   */
  public static async ingestFile(
    filePath: string,
    originalName: string,
    collectionName: string
  ): Promise<DocumentRecord> {
    logger.info(`Starting ingestion of file: '${originalName}' into collection '${collectionName}'`);

    const extension = path.extname(originalName).toLowerCase();
    let extractedText = '';

    try {
      // 1. Text Extraction based on file types
      if (extension === '.pdf') {
        const buffer = fs.readFileSync(filePath);
        const data = await pdfParse(buffer);
        extractedText = data.text;
      } 
      else if (extension === '.docx') {
        const buffer = fs.readFileSync(filePath);
        const data = await mammoth.extractRawText({ buffer });
        extractedText = data.value;
      } 
      else if (extension === '.csv') {
        extractedText = this.parseCSVText(filePath);
      } 
      else if (extension === '.txt' || extension === '.md' || extension === '.markdown') {
        extractedText = fs.readFileSync(filePath, 'utf8');
      } 
      else {
        throw new Error(`Unsupported file extension: ${extension}`);
      }

      if (!extractedText.trim()) {
        throw new Error('Extracted text is empty or blank.');
      }

      // 2. Text Chunking
      const chunks = TextSplitter.split(extractedText);
      if (chunks.length === 0) {
        throw new Error('No valid chunks generated from the extracted text.');
      }

      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const uploadDate = new Date().toISOString();

      // Deduce a product name from the filename for metadata categorization
      const baseName = path.basename(originalName, extension);
      const cleanProductName = baseName
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      // Extract metadata if it is a product description
      let productMetadata: any = {};
      if (collectionName === 'product_descriptions') {
        productMetadata = MetadataFilterService.extractMetadataFromText(extractedText, originalName);
        if (productMetadata.product_name) {
          logger.info(`Extracted metadata for ${productMetadata.product_name}: Category: ${productMetadata.category}, Price: ${productMetadata.price}`);
        }
      }

      // 3. Generate embeddings and prepare chunks for ChromaDB
      const chunksWithEmbeddings = [];
      let idx = 0;

      for (const chunkText of chunks) {
        logger.debug(`Generating embedding for chunk ${idx + 1}/${chunks.length} of ${originalName}`);
        const embedding = await EmbeddingService.generate(chunkText);
        
        chunksWithEmbeddings.push({
          id: `${documentId}_chunk_${idx}`,
          text: chunkText,
          embedding,
          metadata: {
            document_id: documentId,
            filename: originalName,
            product_name: productMetadata.product_name || cleanProductName,
            category: collectionName,
            source_type: extension.substring(1),
            upload_date: uploadDate,
            chunk_index: idx,
            ...productMetadata
          }
        });
        idx++;
      }

      // 4. Load Chunks into ChromaDB
      await ChromaDBService.addChunks(collectionName, chunksWithEmbeddings);

      // 5. Register in DB Service
      const docRecord: DocumentRecord = {
        id: documentId,
        filename: originalName,
        product_name: productMetadata.product_name || cleanProductName,
        category: collectionName,
        source_type: extension.substring(1),
        upload_date: uploadDate,
        chunk_count: chunks.length,
        ...productMetadata
      };

      DBService.addDocument(docRecord);
      logger.info(`Successfully ingested '${originalName}'. Registered ID: ${documentId} with ${chunks.length} chunks.`);
      return docRecord;
    } catch (error) {
      logger.error(`Failed to ingest file '${originalName}':`, error);
      throw error;
    } finally {
      // Always cleanup uploaded temporary file
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        logger.warn(`Failed to cleanup temp file: ${filePath}`);
      }
    }
  }

  /**
   * Helper that reads a CSV file and converts row lists into structured contextual lines.
   */
  private static parseCSVText(filePath: string): string {
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
    
    if (lines.length === 0) return '';

    // Extract headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rowsText: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      if (values.length === headers.length) {
        const rowStr = headers.map((header, idx) => `${header}: ${values[idx]}`).join(', ');
        rowsText.push(rowStr);
      }
    }

    return rowsText.join('\n');
  }
}
