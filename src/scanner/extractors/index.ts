import type { SupportedFramework, Route } from '../../types/index.js';
import { extractExpressRoutes } from './express-extractor.js';
import { extractPythonRoutes } from './python-extractor.js';

export function getExtractor(framework: SupportedFramework): (files: string[]) => Route[] {
  switch (framework) {
    case 'express':
    case 'fastify':
      return extractExpressRoutes;
    case 'fastapi':
    case 'flask':
      return extractPythonRoutes;
    default:
      throw new Error(`No extractor available for framework: ${framework}`);
  }
}
