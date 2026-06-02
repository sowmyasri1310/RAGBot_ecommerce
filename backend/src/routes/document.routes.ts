import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { DocumentService } from '../services/document.service';
import { DBService } from '../services/db.service';
import { ChromaDBService } from '../services/chromadb.service';
import { logger } from '../utils/logger';

const router = Router();

// Configure Multer for local temporary storage
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `upload_${Date.now()}_${file.originalname}`);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedExtensions = ['.pdf', '.docx', '.csv', '.txt', '.md', '.markdown'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}. Only PDF, DOCX, CSV, TXT, MD are supported.`), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB file size limit
});

/**
 * POST /upload
 * Receives file upload, returns temp storage path for ingestion.
 */
router.post('/upload', upload.single('file'), (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    logger.info(`File uploaded to temporary store: ${req.file.filename}`);
    
    return res.status(200).json({
      message: 'File uploaded successfully to temp storage.',
      filePath: req.file.path,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /ingest
 * Triggers full text extraction, local embedding vectorization, and indexes into ChromaDB.
 */
router.post('/ingest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filePath, originalName, collection } = req.body;

    if (!filePath || !originalName || !collection) {
      return res.status(400).json({ error: 'Missing required parameters: filePath, originalName, and collection are required.' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Temporary upload file not found. Re-upload your file.' });
    }

    const docRecord = await DocumentService.ingestFile(filePath, originalName, collection);
    
    return res.status(200).json({
      success: true,
      message: `Document '${originalName}' ingested successfully.`,
      document: docRecord
    });
  } catch (error: any) {
    logger.error('Failed to ingest document:', error);
    return res.status(500).json({ error: error.message || 'Ingestion failure occurred.' });
  }
});

/**
 * POST /documents/ingest-sample
 * Scans the generated e-commerce test dataset and auto-indexes all files.
 */
router.post('/documents/ingest-sample', async (req: Request, res: Response) => {
  try {
    const datasetDir = path.join(__dirname, '..', '..', '..', 'data', 'sample_dataset');
    if (!fs.existsSync(datasetDir)) {
      return res.status(400).json({ error: 'Sample dataset directory not found. Please run the dataset generator first.' });
    }

    const categories = fs.readdirSync(datasetDir);
    const ingestedDocs = [];
    const skippedDocs = [];
    const existingDocs = DBService.getDocuments();

    logger.info('Starting automated bulk ingestion of e-commerce sample dataset...');

    for (const cat of categories) {
      const catDir = path.join(datasetDir, cat);
      if (!fs.statSync(catDir).isDirectory()) continue;

      const files = fs.readdirSync(catDir);
      for (const file of files) {
        // Skip files that have already been ingested into the matching category
        const isIngested = existingDocs.some(d => d.filename === file && d.category === cat);
        if (isIngested) {
          skippedDocs.push({ filename: file, category: cat });
          continue;
        }

        const sourcePath = path.join(catDir, file);
        
        // Copy to the temp uploads directory for standard ingestion
        const tempFilename = `bulk_${Date.now()}_${file}`;
        const tempPath = path.join(uploadDir, tempFilename);
        fs.copyFileSync(sourcePath, tempPath);

        // Process file ingestion
        const docRecord = await DocumentService.ingestFile(tempPath, file, cat);
        ingestedDocs.push(docRecord);
      }
    }

    logger.info(`Bulk ingestion completed. Ingested: ${ingestedDocs.length}, Skipped: ${skippedDocs.length}`);

    return res.status(200).json({
      success: true,
      message: `Sample dataset ingestion run completed.`,
      ingestedCount: ingestedDocs.length,
      skippedCount: skippedDocs.length
    });
  } catch (error: any) {
    logger.error('Bulk sample ingestion failed:', error);
    return res.status(500).json({ error: error.message || 'Bulk ingestion failed.' });
  }
});

/**
 * GET /documents
 * Returns list of all ingested documents.
 */

router.get('/documents', (req: Request, res: Response) => {
  const documents = DBService.getDocuments();
  return res.status(200).json({ documents });
});

/**
 * DELETE /documents/:id
 * Deletes document chunks from ChromaDB and metadata registry.
 */
router.delete('/documents/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const docId = req.params.id;
    
    // Find doc to confirm existence
    const doc = DBService.getDocuments().find(d => d.id === docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // 1. Delete vectors from ChromaDB
    await ChromaDBService.deleteDocument(docId);

    // 2. Delete metadata from JSON DB
    DBService.deleteDocument(docId);

    logger.info(`Successfully deleted document '${doc.filename}' (ID: ${docId})`);
    
    return res.status(200).json({
      success: true,
      message: `Document '${doc.filename}' has been deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /documents
 * Clears all documents from ChromaDB and the metadata database.
 */
router.delete('/documents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('Received request to delete all documents...');
    
    // 1. Reset the active ChromaDB collection
    await ChromaDBService.resetAll();
    
    // 2. Clear all document metadata records in DBService
    const documents = [...DBService.getDocuments()];
    for (const doc of documents) {
      DBService.deleteDocument(doc.id);
    }
    
    logger.info('Successfully cleared all documents and ChromaDB collection.');
    return res.status(200).json({
      success: true,
      message: 'All documents and collection records have been cleared successfully.'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
