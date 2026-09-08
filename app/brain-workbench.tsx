'use client';

import {
  useCallback,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import {
  Brain,
  Eye,
  EyeOff,
  Focus,
  Info,
  LoaderCircle,
  RotateCcw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import {
  BrainViewer,
  type BrainRuntimeStats,
} from '@/components/brain/brain-viewer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import manifestJson from '@/data/brain/manifest.json';
import {
  BRAIN_CATEGORY_PALETTE,
  createInitialBrainVisualState,
  filterBrainNodes,
  indexBrainManifest,
  reduceBrainVisualState,
  validateBrainManifest,
  type BrainManifest,
  type BrainVisualAction,
  type BrainVisualState,
} from '@/lib/brain-atlas';

const manifest = manifestJson as BrainManifest;
const manifestErrors = validateBrainManifest(manifest);
const initialStats: BrainRuntimeStats = {
  structures: 0,
  meshes: 0,
  fps: 0,
  raycastMs: 0,
  draws: 0,
  triangles: 0,
};

export function BrainWorkbench({
  atlasSwitcher,
}: {
  atlasSwitcher?: ReactNode;
}) {
  const nodesById = useMemo(() => indexBrainManifest(manifest), []);
  const [visualState, dispatchVisual] = useReducer(
    (state: BrainVisualState, action: BrainVisualAction) =>
      reduceBrainVisualState(state, action, nodesById),
    undefined,
    () => createInitialBrainVisualState(),
  );
  const {
    selectedId,
    hiddenCategories,
    fadeOthers,
    isolateSelected,
    cortexOpacity,
  } = visualState;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [explodeProgress, setExplodeProgress] = useState(0);
  const [focusNonce, setFocusNonce] = useState(0);
  const [resetNonce, setResetNonce] = useState(0);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(
    manifestErrors.length ? manifestErrors.join(' ') : null,
  );
  const [stats, setStats] = useState(initialStats);

  const selected =
    selectedId === null ? null : (nodesById.get(selectedId) ?? null);
  const selectionVisible =
    selected !== null && !hiddenCategories.has(selected.category);
  const filtered = useMemo(
    () => filterBrainNodes(manifest.nodes, query, category).slice(0, 100),
    [category, query],
  );

  const select = useCallback((id: number) => {
    dispatchVisual({ type: 'select', id });
  }, []);
  const markReady = useCallback((next: BrainRuntimeStats) => {
    setStats(next);
    setReady(true);
  }, []);

  const reset = () => {
    dispatchVisual({ type: 'reset' });
    setExplodeProgress(0);
    setResetNonce((value) => value + 1);
  };

  const toggleCategory = (id: string) => {
    dispatchVisual({ type: 'toggle-category', category: id });
  };

  return (
    <main className="flex h-dvh min-h-[680px] flex-col overflow-hidden bg-[#09080d] text-zinc-100">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-coral/15 text-coral">
            <Brain className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-wide">
              Brain Workbench
            </h1>
            <p className="font-mono text-[9px] tracking-[0.16em] text-zinc-600">
              437-STRUCTURE INTERACTIVE ATLAS
            </p>
          </div>
        </div>
        {atlasSwitcher}
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="hidden min-h-0 border-r border-white/10 bg-[#0c0b11] lg:flex lg:flex-col">
          <div className="space-y-3 border-b border-white/10 p-4">
            <div className="relative block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search structure, region, or ID"
                className="border-white/10 bg-white/[0.035] pl-9 text-xs"
                aria-label="Search brain structures"
              />
            </div>
            <select
              value={category ?? ''}
              onChange={(event) => setCategory(event.target.value || null)}
              className="h-9 w-full rounded-md border border-white/10 bg-[#15131b] px-3 text-xs text-zinc-300"
              aria-label="Filter structure list by classification"
            >
              <option value="">All classifications</option>
              {Object.entries(manifest.categories).map(([id, item]) => (
                <option key={id} value={id}>
                  {item.label} ({item.count})
                </option>
              ))}
            </select>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="p-2">
              <p className="px-2 py-2 font-mono text-[9px] tracking-[0.14em] text-zinc-600">
                {filtered.length} OF {manifest.nodes.length} STRUCTURES
              </p>
              {filtered.map((node) => (
                <button
                  type="button"
                  key={node.id}
                  data-brain-id={node.id}
                  onClick={() => select(node.id)}
                  className={`mb-1 w-full rounded-lg px-3 py-2 text-left transition-colors ${
                    selectedId === node.id
                      ? 'bg-coral/15 text-coral'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                  }`}
                >
                  <span className="block truncate text-xs font-medium">
                    {node.label}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[9px] text-zinc-600">
                    #{node.id} · {node.side} · {node.region}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </aside>

        <section className="relative min-h-[420px] overflow-hidden bg-[radial-gradient(ellipse_at_50%_38%,#27212d_0%,#121018_44%,#07070a_100%)] before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(115deg,rgba(94,144,167,0.06),transparent_38%,rgba(213,100,80,0.055))]">
          {!loadError && (
            <BrainViewer
              nodesById={nodesById}
              visualState={visualState}
              explodeProgress={explodeProgress}
              focusNonce={focusNonce}
              resetNonce={resetNonce}
              onSelect={select}
              onReady={markReady}
              onStats={setStats}
              onError={setLoadError}
            />
          )}
          {!ready && !loadError && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#09080d]/75">
              <div className="text-center">
                <LoaderCircle className="mx-auto mb-3 size-6 animate-spin text-coral" />
                <p className="font-mono text-[10px] tracking-[0.16em] text-zinc-400">
                  LOADING BRAIN ATLAS
                </p>
              </div>
            </div>
          )}
          {loadError && (
            <div className="absolute inset-0 grid place-items-center p-8">
              <div
                role="alert"
                className="max-w-md rounded-2xl border border-red-400/20 bg-red-950/20 p-6 text-center"
              >
                <p className="mb-2 text-sm font-semibold text-red-200">
                  Brain atlas unavailable
                </p>
                <p className="mb-4 text-xs leading-5 text-zinc-400">
                  {loadError}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => location.reload()}
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="brain-focus"
              disabled={!selectionVisible}
              onClick={() => setFocusNonce((value) => value + 1)}
              className="rounded-full border border-white/10 bg-black/55 px-3 py-2 text-[10px] text-zinc-300 backdrop-blur disabled:opacity-35"
            >
              <Focus className="mr-1.5 inline size-3" /> Focus
            </button>
            <button
              type="button"
              data-testid="brain-fade"
              disabled={!selectionVisible}
              aria-pressed={fadeOthers}
              onClick={() => dispatchVisual({ type: 'toggle-fade' })}
              className="rounded-full border border-white/10 bg-black/55 px-3 py-2 text-[10px] text-zinc-300 backdrop-blur disabled:opacity-35"
            >
              <Eye className="mr-1.5 inline size-3" /> Fade
            </button>
            <button
              type="button"
              data-testid="brain-isolate"
              disabled={!selectionVisible}
              aria-pressed={isolateSelected}
              onClick={() => dispatchVisual({ type: 'toggle-isolate' })}
              className="rounded-full border border-white/10 bg-black/55 px-3 py-2 text-[10px] text-zinc-300 backdrop-blur disabled:opacity-35"
            >
              <EyeOff className="mr-1.5 inline size-3" /> Isolate
            </button>
            <button
              type="button"
              data-testid="brain-reset"
              onClick={reset}
              className="rounded-full border border-white/10 bg-black/55 px-3 py-2 text-[10px] text-zinc-300 backdrop-blur"
            >
              <RotateCcw className="mr-1.5 inline size-3" /> Reset
            </button>
          </div>

          <div
            data-testid="brain-runtime-stats"
            className="absolute right-3 top-3 hidden rounded-full border border-white/10 bg-black/55 px-3 py-1.5 font-mono text-[9px] text-zinc-500 backdrop-blur sm:block"
          >
            {stats.structures}/437 · {stats.meshes} meshes · {stats.fps || '—'}
            {' fps · '}
            {stats.draws} draws · {stats.raycastMs} ms pick
          </div>

          <div
            data-testid="brain-explode-control"
            data-explode-progress={explodeProgress}
            className="absolute bottom-4 left-1/2 w-[min(82%,480px)] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#0a0910]/80 px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.38)] backdrop-blur-xl"
          >
            <div className="mb-2 flex items-center justify-between font-mono text-[9px] tracking-[0.15em]">
              <span
                className={
                  explodeProgress === 0 ? 'text-coral' : 'text-zinc-500'
                }
              >
                ASSEMBLED
              </span>
              <output
                htmlFor="brain-explode-slider"
                className="rounded-full bg-white/[0.06] px-2 py-0.5 text-zinc-300"
              >
                {explodeProgress}%
              </output>
              <span
                className={
                  explodeProgress === 100 ? 'text-coral' : 'text-zinc-500'
                }
              >
                EXPLODED
              </span>
            </div>
            <input
              id="brain-explode-slider"
              data-testid="brain-explode-slider"
              type="range"
              min="0"
              max="100"
              step="1"
              value={explodeProgress}
              onChange={(event) =>
                setExplodeProgress(Number(event.target.value))
              }
              className="block h-2 w-full cursor-ew-resize accent-[#ff745c]"
              aria-label="Explode brain structures"
              aria-valuetext={`${explodeProgress}% ${
                explodeProgress === 0 ? 'assembled' : 'exploded'
              }`}
            />
          </div>
        </section>

        <aside className="hidden min-h-0 border-l border-white/10 bg-[#0c0b11] xl:flex xl:flex-col">
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-6 p-5">
              <section>
                <p className="mb-2 font-mono text-[9px] tracking-[0.14em] text-coral">
                  SELECTED STRUCTURE
                </p>
                {selected ? (
                  <>
                    <h2
                      data-testid="brain-selected-label"
                      className="text-xl font-semibold leading-tight text-[#f3d8cd]"
                    >
                      {selected.label}
                    </h2>
                    <p className="mt-2 font-mono text-[10px] text-zinc-600">
                      #{selected.id} · {selected.side} · {selected.category}
                    </p>
                    <dl className="mt-5 space-y-3 text-xs">
                      <div>
                        <dt className="text-zinc-600">Region</dt>
                        <dd className="mt-1 text-zinc-300">
                          {selected.region}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-zinc-600">Source metadata</dt>
                        <dd className="mt-1 text-zinc-300">
                          {selected.source}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-zinc-600">Hierarchy</dt>
                        <dd className="mt-1 leading-5 text-zinc-400">
                          {selected.ta2.join(' › ')}
                        </dd>
                      </div>
                    </dl>
                  </>
                ) : (
                  <p className="text-xs leading-5 text-zinc-500">
                    Pick a structure in 3D or select one from the indexed list.
                  </p>
                )}
              </section>

              <section className="border-t border-white/10 pt-5">
                <p className="mb-3 font-mono text-[9px] tracking-[0.14em] text-zinc-600">
                  CLASSIFICATION VISIBILITY
                </p>
                <p className="mb-3 text-[10px] leading-4 text-zinc-600">
                  Vascular and cranial-nerve layers start hidden for a clearer,
                  lower-draw overview.
                </p>
                <div className="space-y-1.5">
                  {Object.entries(manifest.categories).map(([id, item]) => {
                    const visible = !hiddenCategories.has(id);
                    return (
                      <button
                        type="button"
                        key={id}
                        data-brain-category={id}
                        aria-pressed={visible}
                        onClick={() => toggleCategory(id)}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[11px] text-zinc-400 hover:bg-white/5"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="size-2 shrink-0 rounded-full shadow-[0_0_10px_currentColor]"
                            style={{
                              backgroundColor:
                                BRAIN_CATEGORY_PALETTE[id] ?? '#9f8c85',
                            }}
                          />
                          <span className="truncate">{item.label}</span>
                        </span>
                        <span className="ml-2 font-mono text-[9px] text-zinc-600">
                          {visible ? 'ON' : 'OFF'} · {item.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <label className="mt-4 block text-[11px] text-zinc-500">
                  Cortex opacity · {Math.round(cortexOpacity * 100)}%
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={cortexOpacity}
                    onChange={(event) =>
                      dispatchVisual({
                        type: 'set-cortex-opacity',
                        value: Number(event.target.value),
                      })
                    }
                    className="mt-2 w-full accent-[#ff6b52]"
                  />
                </label>
              </section>

              <section className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.035] p-4 text-[11px] leading-5 text-zinc-400">
                <div className="mb-2 flex items-center gap-2 text-emerald-300">
                  <ShieldCheck className="size-4" />
                  <strong>Asset license · CC BY-SA 4.0</strong>
                </div>
                <p>
                  Brain model © Z-Anatomy contributors, with BodyParts3D/DBCLS
                  and registered atlas sources. Adapted for interactive display.
                </p>
                <a
                  href="https://creativecommons.org/licenses/by-sa/4.0/"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-emerald-300 underline underline-offset-2"
                >
                  <Info className="size-3" /> License and attribution
                </a>
                <p className="mt-2 text-zinc-600">
                  Educational anatomy reference; not for clinical use.
                </p>
              </section>
            </div>
          </ScrollArea>
        </aside>
      </div>
    </main>
  );
}
