#!/usr/bin/env node
/**
 * Preinstall script to ensure proprietary-ai package stub exists
 *
 * This enables the "Open Core" strategy where:
 * - Infrastructure code (orchestrator, GitHub integration) is public
 * - Proprietary AI prompts and agent logic are gitignored
 * - A stub package ensures the monorepo builds for external users
 */

const fs = require('fs');
const path = require('path');

const PROPRIETARY_DIR = path.join(__dirname, '..', 'packages', 'proprietary-ai');
const PACKAGE_JSON_PATH = path.join(PROPRIETARY_DIR, 'package.json');
const INDEX_PATH = path.join(PROPRIETARY_DIR, 'src', 'index.ts');
const TSCONFIG_PATH = path.join(PROPRIETARY_DIR, 'tsconfig.json');

// Check if real implementation exists (has more than just .gitkeep)
const hasRealImplementation = fs.existsSync(PACKAGE_JSON_PATH);

if (!hasRealImplementation) {
  console.log('📦 Generating proprietary-ai stub package (Open Core mode)...');

  // Create directories
  fs.mkdirSync(path.join(PROPRIETARY_DIR, 'src'), { recursive: true });
  fs.mkdirSync(path.join(PROPRIETARY_DIR, 'dist'), { recursive: true });

  // Create stub package.json
  const stubPackageJson = {
    name: '@ai-cd/proprietary-ai',
    version: '0.1.0',
    private: true,
    description: 'Stub package for Open Core distribution',
    main: './dist/index.js',
    types: './dist/index.d.ts',
    exports: {
      '.': {
        types: './dist/index.d.ts',
        default: './dist/index.js'
      }
    },
    scripts: {
      build: 'tsc',
      clean: 'rm -rf dist'
    },
    devDependencies: {
      '@types/node': '^22.10.2',
      typescript: '^5.6.3'
    }
  };

  fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(stubPackageJson, null, 2));

  // Create stub TypeScript source
  const stubIndex = `/**
 * Stub implementation for Open Core distribution
 *
 * This package is gitignored and contains proprietary AI agent logic.
 * External users receive this stub to ensure the monorepo builds.
 */

export interface IAgent {
  plan(issue: any): Promise<any>;
  code(plan: any, context: any): Promise<any>;
  review(code: any): Promise<any>;
}

export class StubAgent implements IAgent {
  async plan(_issue: any): Promise<any> {
    throw new Error('Proprietary AI package not available - stub only');
  }

  async code(_plan: any, _context: any): Promise<any> {
    throw new Error('Proprietary AI package not available - stub only');
  }

  async review(_code: any): Promise<any> {
    throw new Error('Proprietary AI package not available - stub only');
  }
}

export default StubAgent;
`;

  fs.writeFileSync(INDEX_PATH, stubIndex);

  // Create stub tsconfig.json
  const stubTsConfig = {
    extends: '../../tsconfig.json',
    compilerOptions: {
      rootDir: './src',
      outDir: './dist',
      composite: true
    },
    include: ['src/**/*']
  };

  fs.writeFileSync(TSCONFIG_PATH, JSON.stringify(stubTsConfig, null, 2));

  console.log('✅ Stub package created successfully');
  console.log('   Real implementation can be added in packages/proprietary-ai/');
} else {
  console.log('✅ Proprietary AI package found (production mode)');
}
