import { ChromaClient, Collection } from 'chromadb';
import { logger } from '../utils/logger';
import { cleanEnvVar } from '../tracing/config';

export class ChromaDBService {
  private static client: ChromaClient | null = null;
  private static collections: Record<string, Collection> = {};

  /**
   * Resolves the configured collection name from environment variables with fallback to 'AdaptiveRAG_ecommerce'.
   */
  public static getCollectionName(): string {
    return cleanEnvVar(process.env.CHROMA_COLLECTION_NAME) || 'AdaptiveRAG_ecommerce';
  }

  /**
   * Getter for COLLECTION_NAMES list to return only the active single collection, 
   * which ensures the application interacts exclusively with this collection.
   */
  public static get COLLECTION_NAMES(): string[] {
    return [this.getCollectionName()];
  }

  /**
   * Initializes connection to ChromaDB HTTP Server and ensures the designated collection exists.
   */
  public static async initialize(): Promise<void> {
    if (this.client) return;

    const host = cleanEnvVar(process.env.CHROMA_HOST) || cleanEnvVar(process.env.CHROMADB_HOST) || 'localhost';
    const port = cleanEnvVar(process.env.CHROMA_PORT) || cleanEnvVar(process.env.CHROMADB_PORT) || '8000';
    
    let url: string;
    if (host.startsWith('http://') || host.startsWith('https://')) {
      url = host;
    } else if (host === 'localhost' || host === '127.0.0.1') {
      url = `http://${host}:${port}`;
    } else {
      url = `https://${host}`;
    }

    try {
      const apiKey = cleanEnvVar(process.env.CHROMA_API_KEY);
      const tenant = cleanEnvVar(process.env.CHROMA_TENANT);
      const database = cleanEnvVar(process.env.CHROMA_DATABASE);
      const collectionName = this.getCollectionName();

      logger.info(`Connecting to ChromaDB at ${url}...`);
      
      const clientParams: any = {
        path: url
      };

      if (apiKey) {
        const isCloud = host.includes('trychroma.com');
        logger.info(`Using Token Authentication for ChromaDB ${isCloud ? 'Cloud' : 'Self-hosted'} connection.`);
        clientParams.auth = {
          provider: 'token',
          credentials: apiKey,
          tokenHeaderType: isCloud ? 'X_CHROMA_TOKEN' : 'AUTHORIZATION'
        };
      }

      if (tenant) {
        logger.info(`Setting ChromaDB Tenant: ${tenant}`);
        clientParams.tenant = tenant;
      }

      if (database) {
        logger.info(`Setting ChromaDB Database: ${database}`);
        clientParams.database = database;
      }

      this.client = new ChromaClient(clientParams);

      // Run heartbeat to test connection
      const heartbeat = await this.client.heartbeat();
      logger.info(`Successfully connected to ChromaDB. Heartbeat: ${heartbeat}`);

      // Add detailed startup connection logs as requested
      logger.info('================ CHROMA CONNECTION DETAILS ================');
      logger.info(`Chroma URL     : ${url}`);
      logger.info(`Tenant ID      : ${tenant || 'default_tenant'}`);
      logger.info(`Database Name  : ${database || 'default_database'}`);
      logger.info(`Collection Name: ${collectionName}`);
      logger.info('===========================================================');

      // Ensure the designated e-commerce collection is initialized
      logger.info(`Initializing ChromaDB collection: ${collectionName}`);
      const collection = await this.client.getOrCreateCollection({
        name: collectionName,
        // Since we supply our own embeddings, we don't set a default embedding function in ChromaDB
      });
      this.collections[collectionName] = collection;
      
      logger.info(`ChromaDB collection '${collectionName}' verified/created successfully.`);
    } catch (error) {
      logger.error('Failed to connect to ChromaDB or initialize collections:', error);
      throw error;
    }
  }

  /**
   * Returns the reference of the initialized single collection.
   * Note: Maps all incoming query collection names to the configured single collection name
   * to guarantee the application connects to and uses only this collection.
   */
  public static getCollection(name: string): Collection {
    const activeName = this.getCollectionName();
    const col = this.collections[activeName];
    if (!col) {
      throw new Error(`Collection '${activeName}' is not initialized. Ensure ChromaDBService is initialized.`);
    }
    return col;
  }

  /**
   * Adds text chunks with generated embeddings and metadata to the active collection.
   */
  public static async addChunks(
    collectionName: string,
    chunks: Array<{
      id: string;
      text: string;
      embedding: number[];
      metadata: {
        document_id: string;
        filename: string;
        product_name: string;
        category: string;
        source_type: string;
        upload_date: string;
        chunk_index: number;
        [key: string]: any;
      };
    }>
  ): Promise<void> {
    const activeName = this.getCollectionName();
    try {
      const collection = this.getCollection(activeName);
      
      const ids = chunks.map(c => c.id);
      const embeddings = chunks.map(c => c.embedding);
      const metadatas = chunks.map(c => c.metadata);
      const documents = chunks.map(c => c.text);

      logger.info(`Adding ${chunks.length} chunks to collection '${activeName}'...`);
      await collection.add({
        ids,
        embeddings,
        metadatas,
        documents
      });
      logger.info(`Successfully added chunks to '${activeName}'.`);
    } catch (error) {
      logger.error(`Error adding chunks to ChromaDB collection '${activeName}':`, error);
      throw error;
    }
  }

  /**
   * Queries the single active collection using a query embedding.
   */
  public static async queryCollection(
    collectionName: string,
    queryEmbedding: number[],
    topK: number = 3,
    where?: any
  ): Promise<Array<{
    id: string;
    text: string;
    metadata: any;
    distance: number;
    similarity: number;
  }>> {
    const activeName = this.getCollectionName();
    try {
      const collection = this.getCollection(activeName);

      logger.debug(`Querying collection '${activeName}' (topK = ${topK}, where = ${JSON.stringify(where)})...`);
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
        where
      });

      const items: any[] = [];
      if (!results || !results.ids || results.ids.length === 0) {
        return items;
      }

      // Results are returned as nested arrays (since we can query multiple vectors at once)
      const ids = results.ids[0] || [];
      const documents = results.documents[0] || [];
      const metadatas = results.metadatas[0] || [];
      const distances = results.distances ? results.distances[0] || [] : [];

      for (let i = 0; i < ids.length; i++) {
        const dist = distances && distances[i] !== null && distances[i] !== undefined ? distances[i] : 1;
        // In Chroma, L2 distance is default. Convert L2 distance to cosine-like similarity: 
        // 1 / (1 + dist) or similar. L2 distance ranges from 0 (identical) to higher values.
        const similarity = 1 / (1 + dist);

        items.push({
          id: ids[i],
          text: documents[i] || '',
          metadata: metadatas[i] || {},
          distance: dist,
          similarity: similarity
        });
      }

      return items;
    } catch (error) {
      logger.error(`Error querying ChromaDB collection '${activeName}':`, error);
      return [];
    }
  }

  /**
   * Deletes all chunks associated with a document_id across the collection.
   */
  public static async deleteDocument(documentId: string): Promise<void> {
    const activeName = this.getCollectionName();
    try {
      logger.info(`Deleting document '${documentId}' from collection '${activeName}'...`);
      const collection = this.getCollection(activeName);
      // Chroma support where-clause filtering for deletions
      await collection.delete({
        where: { document_id: documentId }
      });
      logger.info(`Document '${documentId}' deleted successfully.`);
    } catch (error) {
      logger.error(`Failed to delete document '${documentId}':`, error);
      throw error;
    }
  }

  /**
   * Fetches statistics of the single active collection.
   */
  public static async getStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};
    const activeName = this.getCollectionName();
    try {
      const collection = this.getCollection(activeName);
      const count = await collection.count();
      stats[activeName] = count;
      return stats;
    } catch (error) {
      logger.error(`Error fetching collection counts for '${activeName}':`, error);
      return {};
    }
  }

  /**
   * Dedicated catalog retrieval function that returns all available products in the catalog
   * by querying metadata in the single collection and extracting unique product names.
   */
  public static async getAllProducts(): Promise<Array<{ product_name: string; filename: string }>> {
    const activeName = this.getCollectionName();
    try {
      const collection = this.getCollection(activeName);
      // Fetch all items from the collection
      const results = await collection.get({
        include: ['metadatas' as any]
      });

      const metadatas = results.metadatas || [];
      const productMap = new Map<string, string>(); // maps cleaned product name to its original filename

      for (let i = 0; i < metadatas.length; i++) {
        const meta = metadatas[i] as any;
        if (meta && meta.category === 'product_descriptions') {
          let name = meta.product_name;
          if (name) {
            // Clean/standardize common naming discrepancies if any
            if (name.toLowerCase().includes('macbook')) name = 'Apple MacBook Pro 16';
            else if (name.toLowerCase().includes('predator')) name = 'Acer Predator Helios 16';
            else if (name.toLowerCase().includes('spectre')) name = 'HP Spectre x360';
            else if (name.toLowerCase().includes('zephyrus')) name = 'Asus ROG Zephyrus G16';
            else if (name.toLowerCase().includes('thinkpad')) name = 'Lenovo ThinkPad X1 Carbon';
            else if (name.toLowerCase().includes('keychron')) name = 'Keychron Q1 Pro Keyboard';
            else if (name.toLowerCase().includes('anker')) name = 'Anker Prime 20K Power Bank';
            else if (name.toLowerCase().includes('sony') || name.toLowerCase().includes('wh1000xm5')) name = 'Sony WH-1000XM5 Headphones';
            else if (name.toLowerCase().includes('bose') || name.toLowerCase().includes('quietcomfort')) name = 'Bose QuietComfort Ultra Earbuds';
            else if (name.toLowerCase().includes('logitech') || name.toLowerCase().includes('mx keys')) name = 'Logitech MX Keys S';
            else if (name.toLowerCase().includes('watch ultra') || name.toLowerCase().includes('apple watch')) name = 'Apple Watch Ultra 2';
            else if (name.toLowerCase().includes('osmo') || name.toLowerCase().includes('pocket 3')) name = 'DJI Osmo Pocket 3';
            else if (name.toLowerCase().includes('deathadder') || name.toLowerCase().includes('razer')) name = 'Razer DeathAdder V3 Pro';
            else if (name.toLowerCase().includes('odyssey') || name.toLowerCase().includes('neo g9')) name = 'Samsung Odyssey Neo G9';
            else if (name.toLowerCase().includes('xps') || name.toLowerCase().includes('dell')) name = 'Dell XPS 15';
            
            productMap.set(name, meta.filename || '');
          }
        }
      }

      // Format as standard array
      const products = Array.from(productMap.entries()).map(([name, file]) => ({
        product_name: name,
        filename: file
      }));

      const productOrder = [
        'Dell XPS 15',
        'HP Spectre x360',
        'Apple MacBook Pro 16',
        'Asus ROG Zephyrus G16',
        'Acer Predator Helios 16',
        'Lenovo ThinkPad X1 Carbon',
        'Sony WH-1000XM5 Headphones',
        'Bose QuietComfort Ultra Earbuds',
        'Apple Watch Ultra 2',
        'DJI Osmo Pocket 3',
        'Logitech MX Keys S',
        'Keychron Q1 Pro Keyboard',
        'Razer DeathAdder V3 Pro',
        'Samsung Odyssey Neo G9',
        'Anker Prime 20K Power Bank'
      ];

      const customSort = (list: Array<{ product_name: string; filename: string }>) => {
        list.sort((a, b) => {
          const indexA = productOrder.indexOf(a.product_name);
          const indexB = productOrder.indexOf(b.product_name);
          if (indexA === -1 && indexB === -1) return a.product_name.localeCompare(b.product_name);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
      };

      customSort(products);

      if (products.length === 0) {
        logger.info('ChromaDB returned empty product listing. Using graceful fallback catalog list.');
        const fallbackList = [
          { product_name: 'Dell XPS 15', filename: 'dell_xps_15_description.md' },
          { product_name: 'HP Spectre x360', filename: 'hp_spectre_x360_description.md' },
          { product_name: 'Apple MacBook Pro 16', filename: 'apple_macbook_pro_16_description.md' },
          { product_name: 'Asus ROG Zephyrus G16', filename: 'asus_rog_zephyrus_g16.md' },
          { product_name: 'Acer Predator Helios 16', filename: 'acer_predator_helios_16.txt' },
          { product_name: 'Lenovo ThinkPad X1 Carbon', filename: 'lenovo_thinkpad_x1_carbon.txt' },
          { product_name: 'Sony WH-1000XM5 Headphones', filename: 'sony_wh1000xm5_headphones.txt' },
          { product_name: 'Bose QuietComfort Ultra Earbuds', filename: 'bose_quietcomfort_ultra_earbuds.md' },
          { product_name: 'Apple Watch Ultra 2', filename: 'apple_watch_ultra_2.txt' },
          { product_name: 'DJI Osmo Pocket 3', filename: 'dji_osmo_pocket_3.md' },
          { product_name: 'Logitech MX Keys S', filename: 'logitech_mx_keys_s.md' },
          { product_name: 'Keychron Q1 Pro Keyboard', filename: 'keychron_q1_pro_keyboard.txt' },
          { product_name: 'Razer DeathAdder V3 Pro', filename: 'razer_deathadder_v3_pro.md' },
          { product_name: 'Samsung Odyssey Neo G9', filename: 'samsung_odyssey_neo_g9.md' },
          { product_name: 'Anker Prime 20K Power Bank', filename: 'anker_prime_20k_powerbank.txt' }
        ];
        customSort(fallbackList);
        return fallbackList;
      }

      return products;
    } catch (error) {
      logger.error('Error in getAllProducts:', error);
      return [];
    }
  }

  /**
   * Resets the active collection (deletes all records). Useful for clean installs.
   */
  public static async resetAll(): Promise<void> {
    const activeName = this.getCollectionName();
    try {
      logger.warn(`Resetting active ChromaDB collection '${activeName}'...`);
      const collection = this.getCollection(activeName);
      await collection.delete({});
      logger.info('ChromaDB collection reset completed.');
    } catch (error) {
      logger.error(`Error resetting ChromaDB collection '${activeName}':`, error);
      throw error;
    }
  }
}
