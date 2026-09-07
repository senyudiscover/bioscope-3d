import fs from 'node:fs';
import path from 'node:path';

// Patch source-of-truth for the camera logic inside the third-party viewer
// package (@vixotic/vanatome-react). The 0.1.6 package has existed in two
// different bundle shapes, so version alone cannot identify the correct patch.
//
// Rules enforced here:
//   1. The automatic camera fit may run ONLY when a new explicit focus
//      request arrives (focusRequestKey changed). Other effect dependencies
//      may change without moving the camera.
//   2. The maximum zoom-out distance remains the externally configured
//      maxDistance. The legacy bundle dynamically shrank it; the current
//      registry bundle already passes the global limit straight through.

const target = path.resolve('node_modules/@vixotic/vanatome-react/dist/VanatomeViewer.js');
const source = fs.readFileSync(target, 'utf8');

const countOccurrences = (text, token) => text.split(token).length - 1;

// Sentinel-driven, exactly-once replacement. A matching `done` token makes
// the operation idempotent; ambiguous or missing source structure fails the
// install loudly instead of applying a partial patch.
const applyOnce = (text, done, from, to, label) => {
  const doneCount = countOccurrences(text, done);
  if (doneCount === 1) return text;
  if (doneCount > 1) {
    throw new Error(`Vanatome camera patch found an ambiguous installed viewer (${label}: duplicate patched anchor).`);
  }

  const sourceCount = countOccurrences(text, from);
  if (sourceCount !== 1) {
    throw new Error(
      `Vanatome camera patch no longer matches the installed viewer version (${label}: expected 1 source anchor, found ${sourceCount}).`,
    );
  }
  return text.replace(from, to);
};

const previousResetDeclaration = 'const previousResetKey = useRef(resetViewKey);';
const previousFocusDeclaration = 'const previousFocusKey = useRef(focusRequestKey);';
const focusEffectStart = 'useEffect(() => {\n        if (!selectedId)';
const focusGuard = 'if (previousFocusKey.current === focusRequestKey)';

const legacyDistanceLimitsDeclaration =
  'const [distanceLimits, setDistanceLimits] = useState({ min: minDistance, max: maxDistance });';
const legacyShrinkingMax =
  'max: Math.min(maxDistance, Math.max(distance * 12, sphere.radius * 9)),';
const legacyGlobalMax = 'max: maxDistance,';
const globalOrbitLimits =
  'minDistance: minDistance, maxDistance: maxDistance, onChange:';
const legacyOrbitLimits =
  'minDistance: distanceLimits.min, maxDistance: distanceLimits.max, onChange:';
const currentFocusLimits =
  'minimumDistance: focusDistance,\n            minDistance,\n            maxDistance,\n        });';

const hasLegacyShrinkingMax = source.includes(legacyShrinkingMax);
const hasLegacyDistanceContract =
  source.includes(legacyDistanceLimitsDeclaration) ||
  source.includes(legacyGlobalMax) ||
  source.includes(legacyOrbitLimits);
const hasCurrentDistanceContract =
  source.includes(currentFocusLimits) && source.includes(globalOrbitLimits);

let bundleShape;
if (hasLegacyShrinkingMax) {
  bundleShape = 'legacy-unpatched';
} else if (hasLegacyDistanceContract) {
  bundleShape = 'legacy-patched';
} else if (hasCurrentDistanceContract) {
  bundleShape = 'current';
} else {
  throw new Error(
    'Vanatome camera patch does not recognize the installed viewer camera distance contract.',
  );
}

let patched = source;

// Both bundle shapes still need the focus-request guard.
patched = applyOnce(
  patched,
  previousFocusDeclaration,
  previousResetDeclaration,
  `${previousResetDeclaration}\n    ${previousFocusDeclaration}`,
  'focus guard declaration',
);
patched = applyOnce(
  patched,
  focusGuard,
  focusEffectStart,
  `useEffect(() => {\n        // Effect dependencies include visibility and model state. Only a new\n        // explicit controller focus request may move the camera.\n        if (previousFocusKey.current === focusRequestKey)\n            return;\n        previousFocusKey.current = focusRequestKey;\n        if (!selectedId)`,
  'focus effect guard',
);

if (bundleShape === 'legacy-unpatched') {
  // The older 0.1.6 bundle computed per-focus dolly limits. Preserve its
  // dynamic minimum, but replace the shrinking maximum with the global value.
  patched = applyOnce(
    patched,
    legacyDistanceLimitsDeclaration,
    previousFocusDeclaration,
    `${previousFocusDeclaration}\n    ${legacyDistanceLimitsDeclaration}`,
    'legacy distance-limit state',
  );
  patched = applyOnce(
    patched,
    legacyGlobalMax,
    legacyShrinkingMax,
    legacyGlobalMax,
    'legacy global maxDistance',
  );
  patched = applyOnce(
    patched,
    legacyOrbitLimits,
    globalOrbitLimits,
    legacyOrbitLimits,
    'legacy OrbitControls distance limits',
  );
  bundleShape = 'legacy-patched';
}

// Post-patch contract verification is shape-specific. This is intentionally
// stricter than a successful string replacement: partial patches must fail the
// postinstall command with a non-zero exit code.
const declarationIndex = patched.indexOf(previousFocusDeclaration);
const guardIndex = patched.indexOf(focusGuard);
const selectedIdIndex = patched.indexOf('if (!selectedId)');
if (declarationIndex === -1 || guardIndex === -1 || guardIndex > selectedIdIndex) {
  throw new Error('Vanatome camera patch: focusRequestKey guard contract failed after patch.');
}
if (patched.includes(legacyShrinkingMax)) {
  throw new Error('Vanatome camera patch: shrinking maxDistance still present after patch.');
}

if (bundleShape === 'current') {
  if (!patched.includes(currentFocusLimits) || !patched.includes(globalOrbitLimits)) {
    throw new Error('Vanatome camera patch: current global distance contract failed after patch.');
  }
} else if (
  !patched.includes(legacyDistanceLimitsDeclaration) ||
  !patched.includes(legacyGlobalMax) ||
  !patched.includes(legacyOrbitLimits)
) {
  throw new Error('Vanatome camera patch: legacy global distance contract failed after patch.');
}

if (patched !== source) {
  fs.writeFileSync(target, patched);
}
