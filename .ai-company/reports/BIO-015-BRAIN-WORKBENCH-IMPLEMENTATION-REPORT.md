# BIO-015 — Brain Workbench Implementation Report

> Date: 2026-09-08  
> Branch: `feature/bio-015-brain-workbench`  
> Review gate: DSH/CTO review required; do not merge master

## 1. Current BIO-015 Recovery State

- Recovered the existing dedicated worktree at `D:\BioScope-worktrees\bio-015-brain-workbench`.
- Recovered implementation was uncommitted on top of master `007fde7`; it was validated before continuation and preserved as `e1fe08d`.
- Current implementation commit is `288c35b`; master remains unchanged.

## 2. Implementation Summary

- Independent lazy-loaded Brain Workbench with `?module=brain-atlas` deep link.
- 437/437 `bx_id` structures registered through parent-chain metadata lookup (563 render meshes).
- Existing Pick / Select / Focus / Fade / Isolate / category filtering / Reset contract retained.
- Added continuous `ASSEMBLED 0–100 EXPLODED` 3D control and atlas rendering polish.

## 3. Explode Design

- Category and structure centers are calculated once after GLB registration.
- Category offsets are derived from original category centroids relative to the core-brain centroid; reviewed semantic fallback directions are used only for near-central categories.
- Structure offsets extend each structure's original direction relative to its category centroid. Left/right, anatomical axes, original rotation and local neighborhood are preserved; geometry is translated only.
- Category separation uses the early slider phase; structure separation starts after 32% and reaches full separation at 100%.
- All 563 mesh transforms are cached once. Slider changes apply direct cached transforms; there is no per-frame React state walk over 437 structures.
- Focus targets the structure's current transformed bounds. A focused selection follows its current position if the slider changes. Isolate preserves its transform.

## 4. Visual Improvements

- Scientific category palette across cortex, deep grey, diencephalon, ventricles, brainstem, cerebellum, pathways and vascular layers.
- Warm key light, cool fill/rim lighting, ACES tone mapping, restrained roughness/metalness and a deeper neutral atlas background.
- Distinct hover and selected emissive states; category color markers and stronger selected-information hierarchy.
- DPR remains capped at 1.25 and MSAA remains off for the Iris Xe performance guardrail.
- No remesh, smoothing, normals rewrite, structure merge/deletion, mapping change or identity change.

## 5. User-visible Result

- Bottom-centered continuous 3D explode slider with explicit ASSEMBLED / EXPLODED endpoints and live percentage.
- All existing workbench controls remain available in exploded space.
- Reset restores 0% assembled state, default visibility, cleared selection/modes and normal camera framing.

## 6. Commits

- `e1fe08d feat(brain): add lazy-loaded Brain Workbench`
- `288c35b feat(brain): add semantic 3D explode atlas`

## 7. Tests / Build

- `npm test`: PASS — 14 files, 283 tests.
- `npx tsc --noEmit`: PASS — 0 errors.
- `npm run local-build`: PASS.
- `npm run lint`: baseline-only failure — 19 pre-existing errors in shared `components/ui/*` and `hooks/use-mobile.ts`; targeted BIO-015 files report 0 lint errors and no new lint finding was introduced.

## 8. Browser QA

- A: PASS — 0 → 25 → 50 → 75 → 100, continuous slider values and visible 3D transitions.
- B: PASS — 100% Pick / Select / Focus / Fade / Isolate; canvas pick selected real structures and Isolate reduced to 2 draws for the tested two-primitive structure.
- C: PASS — selection persists while slider changes; focused selection follows current transformed position.
- D: PASS — category visibility changes while exploded; hiding cortex reduced the tested view to 169 draws.
- E: PASS — Reset returned assembled / normal visibility / normal camera / cleared interaction state.
- F: PASS — leave to Human Anatomy and return to Brain Workbench via module selector and URL routing.
- G: PASS — 1366×768 laptop and 1600×900 desktop viewport.
- H: PASS — browser console warnings/errors: 0.

## 9. Performance

- Device: Intel Iris Xe Graphics, driver `31.0.101.4502`.
- Assembled orbit: 58.8 FPS observed at the default 1280×720 viewport; assembled idle samples 68–76 FPS.
- Slider checkpoints observed at 69.8 / 60.8 / 56.8 / 71.7 FPS for 25 / 50 / 75 / 100 in the regression pass.
- Fully exploded orbit: 73.8 FPS observed after suppressing hover raycasts during orbit dragging.
- Pick cost varied with view density (about 4.1–26.2 ms); hover remains throttled and uses a cached pickable-mesh list.
- No obvious slider/orbit jank remained after the orbit-raycast fix.

## 10. Deferred Findings

- P1 Finding: Atlas Wall / flat 2D layout remains deferred. It was not implemented or exposed as a formal mode.
- P1 Finding: BVH acceleration may be reconsidered if future always-visible vascular/nerve presets increase dense-view pick cost.

## 11. DSH Review Focus

- Formalize the CEO-directed scope amendment in governance: 3D Exploded Brain v0 is P0; Atlas Wall is a future P1 Finding.
- Review category fallback directions and the 32% phase boundary for anatomical legibility.
- Review deep-structure Focus framing with Fade/Isolate and the public-release ShareAlike gate.

## 12. CEO Decision Required? Yes / No

No. The amendment is implemented within the provided scope; DSH governance formalization and review remain the next gate.
