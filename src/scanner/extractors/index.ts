import type { SupportedFramework, Route } from '../../types/index.js';
import { extractExpressRoutes } from './express-extractor.js';

export function getExtractor(framework: SupportedFramework): (files: string[]) => Route[] {
  switch (framework) {
    case 'express':
      return extractExpressRoutes;
    case 'fastify':
      return extractExpressRoutes;
    default:
      throw new Error(`No extractor available for framework: ${framework}`);
  }
}
