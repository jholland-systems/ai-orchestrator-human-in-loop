/**
 * Architectural Linting Rules - Enforce "Brain & Body" Separation
 *
 * This configuration prevents public infrastructure packages from depending
 * on the proprietary AI package, maintaining the Open Core architecture.
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-proprietary-imports-in-core',
      severity: 'error',
      comment:
        'Core orchestration package must not depend on proprietary AI implementation. ' +
        'Use generic IAgent interface instead.',
      from: { path: '^packages/core' },
      to: { path: '^packages/proprietary-ai' }
    },
    {
      name: 'no-proprietary-imports-in-github-worker',
      severity: 'error',
      comment:
        'GitHub worker package must not depend on proprietary AI implementation. ' +
        'This is public infrastructure code.',
      from: { path: '^packages/github-worker' },
      to: { path: '^packages/proprietary-ai' }
    },
    {
      name: 'no-circular-dependencies',
      severity: 'warn',
      comment:
        'Circular dependencies indicate design issues and make code harder to maintain.',
      from: {},
      to: { circular: true }
    },
    {
      name: 'no-orphans',
      severity: 'info',
      comment:
        'Orphaned modules (not imported anywhere) may indicate unused code.',
      from: { orphan: true },
      to: {}
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules'
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: './tsconfig.json'
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default']
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+'
      },
      archi: {
        collapsePattern: '^(node_modules|packages|apps)/[^/]+',
        theme: {
          graph: {
            splines: 'ortho'
          }
        }
      },
      text: {
        highlightFocused: true
      }
    }
  }
};
