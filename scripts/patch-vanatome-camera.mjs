import fs from 'node:fs';
import path from 'node:path';

// Patch source-of-truth for the camera logic inside the third-party viewer
// package (@vixotic/vanatome-react). It must be idempotent so it can run
// against a fresh install OR an install that was patched by an older version
// of this script (for example one that still shrank maxDistance on focus).
//
// Rules enforced here:
//   1. The automatic camera fit may run ONLY when a new explicit focus
//      request arrives (focusRequestKey changed). Any other dependency
//      change (hover, pointer move, picking, Fade Context, isolation,
//      hiddenIds, visibility, Knowledge Panel updates, plain re-render)
//      re-runs the useEffect but must return immediately.
//   2. The max zoom-out distance is NEVER shrunk below the externally
//      configured maxDistance. Focus may only compute a dynamic minDistance
//      (to stop the camera clipping through the focused structure) and must
//      leave maxDistance at the global value.

const target = path.resolve('node_modules/@vixotic/vanatome-react/dist/VanatomeViewer.js');
const source = fs.readFileSync(target, 'utf8');

// Sentinel-driven idempotent replacement:
//   - if `done` is already present, the step is considered applied (skip);
//   - else require `from` to be present exactly once and replace it.
const apply = (text, done, from, to, label) => {
  if (text.includes(done)) return text;
  if (!text.includes(from)) {
    throw new Error(`Vanatome camera patch no longer matches the installed viewer version (${label}).`);
  }
  return text.replace(from, to);
};

let patched = source;

// 1. Declare the guard refs and the distance-limit state on CameraController.
patched = apply(
  patched,
  'const previousFocusKey = useRef(focusRequestKey);',
  'const previousResetKey = useRef(resetViewKey);',
  'const previousResetKey = useRef(resetViewKey);\n    const previousFocusKey = useRef(focusRequestKey);\n    const [distanceLimits, setDistanceLimits] = useState({ min: minDistance, max: maxDistance });',
  'guard state declaration',
);

// 2. Guard the focus effect: only a changed focusRequestKey may continue.
patched = apply(
  patched,
  'if (previousFocusKey.current === focusRequestKey)',
  'useEffect(() => {\n        if (!selectedId)',
  'useEffect(() => {\n        // Selection may remain stable while hover, picking, isolation, filtering\n        // or opacity changes. Only an explicit controller focus request may move\n        // the camera. Any dependency change re-runs this effect but must return\n        // immediately when focusRequestKey has not changed.\n        if (previousFocusKey.current === focusRequestKey)\n            return;\n        previousFocusKey.current = focusRequestKey;\n        if (!selectedId)',
  'focus effect guard',
);

// 3. Keep the global maxDistance. A small organ focus must never compress the
//    user's maximum zoom-out distance (this was the "zoom then snap back"
//    culprit together with the missing guard above). Replacement of the exact
//    shrinking token is idempotent by construction.
const oldShrinkingMax = 'max: Math.min(maxDistance, Math.max(distance * 12, sphere.radius * 9)),';
if (patched.includes(oldShrinkingMax)) {
  patched = patched.replaceAll(oldShrinkingMax, 'max: maxDistance,');
}

// 4. Make sure OrbitControls actually consumes the distance limits.
patched = apply(
  patched,
  'minDistance: distanceLimits.min, maxDistance: distanceLimits.max',
  'minDistance: minDistance, maxDistance: maxDistance, onChange:',
  'minDistance: distanceLimits.min, maxDistance: distanceLimits.max, onChange:',
  'OrbitControls distance limits',
);

// 5. Fail loudly if the resulting invariants are not satisfied, so a broken
//    patch or an incompatible viewer version is caught at install time.
if (!patched.includes('previousFocusKey.current === focusRequestKey')) {
  throw new Error('Vanatome camera patch: focusRequestKey guard missing after patch.');
}
if (!patched.includes('max: maxDistance,')) {
  throw new Error('Vanatome camera patch: global maxDistance handling missing after patch.');
}
if (patched.includes(oldShrinkingMax)) {
  throw new Error('Vanatome camera patch: shrinking maxDistance still present after patch.');
}

if (patched === source) {
  // Already correct; nothing to write.
  process.exit(0);
}

fs.writeFileSync(target, patched);
