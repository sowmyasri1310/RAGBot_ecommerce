import { Router, Request, Response, NextFunction } from 'express';
import { MetadataFilterService } from '../services/metadataFilter.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /products/search
 * Search products using keyword search on metadata specifications.
 */
router.get('/products/search', (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string || '').toLowerCase().trim();
    const products = MetadataFilterService.getAllProductSpecifications();

    if (!q) {
      return res.status(200).json({ success: true, count: products.length, products });
    }

    const filtered = products.filter(p => 
      p.product_name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.gpu && p.gpu.toLowerCase().includes(q)) ||
      (p.display_type && p.display_type.toLowerCase().includes(q))
    );

    logger.info(`Product Search for "${q}" returned ${filtered.length} matches.`);
    return res.status(200).json({ success: true, count: filtered.length, products: filtered });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /products/filter
 * Filter products based on parameters (category, minPrice, maxPrice, ram, gpu).
 */
router.get('/products/filter', (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = req.query.category as string;
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
    const ram = req.query.ram ? parseInt(req.query.ram as string, 10) : undefined;
    const gpu = req.query.gpu as string;
    const display = req.query.display as string;

    let products = MetadataFilterService.getAllProductSpecifications();

    if (category) {
      products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    if (minPrice !== undefined) {
      products = products.filter(p => p.price >= minPrice);
    }
    if (maxPrice !== undefined) {
      products = products.filter(p => p.price <= maxPrice);
    }
    if (ram !== undefined) {
      products = products.filter(p => p.ram_gb !== undefined && p.ram_gb >= ram);
    }
    if (gpu) {
      products = products.filter(p => p.gpu !== undefined && p.gpu.toLowerCase().includes(gpu.toLowerCase()));
    }
    if (display) {
      products = products.filter(p => p.display_type !== undefined && p.display_type.toLowerCase().includes(display.toLowerCase()));
    }

    return res.status(200).json({ success: true, count: products.length, products });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /products/compare
 * Compare multiple products specified by comma-separated IDs or filenames in query parameter `ids`.
 */
router.get('/products/compare', (req: Request, res: Response, next: NextFunction) => {
  try {
    const idsParam = req.query.ids as string || '';
    if (!idsParam) {
      return res.status(400).json({ error: 'Missing required query parameter: ids (comma-separated list of product IDs or filenames)' });
    }

    const ids = idsParam.split(',').map(id => id.trim().toLowerCase());
    const products = MetadataFilterService.getAllProductSpecifications();

    const matched = products.filter(p => 
      ids.includes(p.source_file.toLowerCase()) || 
      ids.includes(p.product_name.toLowerCase())
    );

    return res.status(200).json({ success: true, count: matched.length, products: matched });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /products
 * Retrieve all products and their structured specifications.
 */
router.get('/products', (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = MetadataFilterService.getAllProductSpecifications();
    return res.status(200).json({ success: true, count: products.length, products });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /products/:id
 * Retrieve a specific product by its ID / filename / name.
 */
router.get('/products/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id.toLowerCase().trim();
    const products = MetadataFilterService.getAllProductSpecifications();

    const product = products.find(p => 
      p.source_file.toLowerCase() === id || 
      p.source_file.replace(/\.[^/.]+$/, "").toLowerCase() === id ||
      p.product_name.toLowerCase() === id ||
      p.product_name.toLowerCase().includes(id)
    );

    if (!product) {
      return res.status(404).json({ error: `Product with identifier '${id}' not found.` });
    }

    return res.status(200).json({ success: true, product });
  } catch (error) {
    next(error);
  }
});

export default router;
