/**
 * Legacy code remains available for reference only. Do not add it to the formal
 * module registry until its visual direction is reviewed again.
 */
export const deprecatedExperimentalModules = [
  {
    id: 'plant-atlas-legacy',
    titleZh: '旧 Plant Atlas',
    status: 'deprecated' as const,
    entry: 'app/plant-workbench.tsx',
    viewer: 'components/plant/plant-viewer.tsx',
  },
] as const;
