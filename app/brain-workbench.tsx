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
import {
  getBrainCategoryNameZh,
  getBrainRegionNameZh,
  localizeBrainHierarchy,
  resolveBrainStructureTerm,
} from '@/lib/brain-terminology';

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

/**
 * 亮色主题下的 3D 控制 chip：白/浅灰底 + 浅边框 + 深灰文字；
 * aria-pressed 激活态用 salmon accent，尺寸与行为保持不变。
 */
const STAGE_CHIP_CLASS =
  'rounded-full border border-zinc-200 bg-white/85 px-3 py-2 text-[10px] text-zinc-700 backdrop-blur transition-colors hover:bg-white disabled:opacity-40';
const STAGE_CHIP_ACTIVE_CLASS =
  'aria-pressed:border-coral aria-pressed:bg-coral aria-pressed:text-white';

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
  const selectedTerm = selected ? resolveBrainStructureTerm(selected) : null;
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
    <main className="brain-shell flex h-dvh min-h-[680px] flex-col overflow-hidden bg-[#f4f6f8] text-zinc-800">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-coral/15 text-coral">
            <Brain className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-wide text-zinc-900">
              Brain Workbench
            </h1>
            <p className="font-mono text-[9px] tracking-[0.16em] text-zinc-400">
              437 结构交互图谱
            </p>
          </div>
        </div>
        <div className="brain-nav shrink-0">{atlasSwitcher}</div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="hidden min-h-0 border-r border-zinc-200 bg-white lg:flex lg:flex-col">
          <div className="space-y-3 border-b border-zinc-200 p-4">
            <div className="relative block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索结构、区域或 ID"
                className="border-zinc-200 bg-zinc-50 pl-9 text-xs text-zinc-800 placeholder:text-zinc-400 dark:bg-zinc-50"
                aria-label="搜索脑结构"
              />
            </div>
            <select
              value={category ?? ''}
              onChange={(event) => setCategory(event.target.value || null)}
              className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-xs text-zinc-700"
              aria-label="按分类筛选结构列表"
            >
              <option value="">全部分类</option>
              {Object.entries(manifest.categories).map(([id, item]) => (
                <option key={id} value={id}>
                  {getBrainCategoryNameZh(id) ?? item.label} ({item.count})
                </option>
              ))}
            </select>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="p-2">
              <p className="px-2 py-2 font-mono text-[9px] tracking-[0.14em] text-zinc-400">
                {filtered.length} / {manifest.nodes.length} 个结构
              </p>
              {filtered.map((node) => {
                const term = resolveBrainStructureTerm(node);
                return (
                  <button
                    type="button"
                    key={node.id}
                    data-brain-id={node.id}
                    onClick={() => select(node.id)}
                    className={`mb-1 w-full rounded-lg px-3 py-2 text-left transition-colors ${
                      selectedId === node.id
                        ? 'bg-coral/10 text-coral ring-1 ring-coral/30 ring-inset'
                        : 'text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900'
                    }`}
                  >
                    <span
                      className="block truncate text-xs font-medium"
                      title={term.englishLabel}
                    >
                      {term.primaryLabel}
                    </span>
                    {term.chineseLabel && (
                      <span className="mt-0.5 block truncate text-[10px] text-zinc-500">
                        {term.englishLabel}
                      </span>
                    )}
                    <span className="mt-0.5 block truncate font-mono text-[9px] text-zinc-400">
                      #{node.id} · {term.sideChinese} · {term.categoryChinese}
                    </span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        <section className="brain-stage relative min-h-[420px] overflow-hidden">
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
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#e8eef5]/85">
              <div className="text-center">
                <LoaderCircle className="mx-auto mb-3 size-6 animate-spin text-coral" />
                <p className="font-mono text-[10px] tracking-[0.16em] text-zinc-500">
                  LOADING BRAIN ATLAS
                </p>
              </div>
            </div>
          )}
          {loadError && (
            <div className="absolute inset-0 grid place-items-center p-8">
              <div
                role="alert"
                className="max-w-md rounded-2xl border border-red-200 bg-white/95 p-6 text-center shadow-[0_18px_50px_rgba(15,23,42,0.12)]"
              >
                <p className="mb-2 text-sm font-semibold text-red-600">
                  Brain atlas unavailable
                </p>
                <p className="mb-4 text-xs leading-5 text-zinc-500">
                  {loadError}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
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
              className={STAGE_CHIP_CLASS}
            >
              <Focus className="mr-1.5 inline size-3" /> 聚焦
            </button>
            <button
              type="button"
              data-testid="brain-fade"
              disabled={!selectionVisible}
              aria-pressed={fadeOthers}
              onClick={() => dispatchVisual({ type: 'toggle-fade' })}
              className={`${STAGE_CHIP_CLASS} ${STAGE_CHIP_ACTIVE_CLASS}`}
            >
              <Eye className="mr-1.5 inline size-3" /> 淡化上下文
            </button>
            <button
              type="button"
              data-testid="brain-isolate"
              disabled={!selectionVisible}
              aria-pressed={isolateSelected}
              onClick={() => dispatchVisual({ type: 'toggle-isolate' })}
              className={`${STAGE_CHIP_CLASS} ${STAGE_CHIP_ACTIVE_CLASS}`}
            >
              <EyeOff className="mr-1.5 inline size-3" /> 隔离
            </button>
            <button
              type="button"
              data-testid="brain-reset"
              onClick={reset}
              className={STAGE_CHIP_CLASS}
            >
              <RotateCcw className="mr-1.5 inline size-3" /> 重置
            </button>
          </div>

          <div
            data-testid="brain-runtime-stats"
            className="absolute right-3 top-3 hidden rounded-full border border-zinc-200 bg-white/85 px-3 py-1.5 font-mono text-[9px] text-zinc-500 backdrop-blur sm:block"
          >
            {stats.structures}/437 · {stats.meshes} 网格 · {stats.fps || '—'}
            {' fps · '}
            {stats.draws} 绘制 · {stats.raycastMs} ms 拾取
          </div>

          <div
            data-testid="brain-explode-control"
            data-explode-progress={explodeProgress}
            className="absolute bottom-4 left-1/2 w-[min(82%,480px)] -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white/90 px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.1)] backdrop-blur-xl"
          >
            <div className="mb-2 flex items-center justify-between font-mono text-[9px] tracking-[0.15em]">
              <span
                className={
                  explodeProgress === 0 ? 'text-coral' : 'text-zinc-500'
                }
              >
                已组装
              </span>
              <output
                htmlFor="brain-explode-slider"
                className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600"
              >
                {explodeProgress}%
              </output>
              <span
                className={
                  explodeProgress === 100 ? 'text-coral' : 'text-zinc-500'
                }
              >
                已分解
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
              aria-label="分解脑结构"
              aria-valuetext={`${explodeProgress}% ${
                explodeProgress === 0 ? '已组装' : '已分解'
              }`}
            />
          </div>
        </section>

        <aside className="hidden min-h-0 border-l border-zinc-200 bg-white xl:flex xl:flex-col">
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-6 p-5">
              <section>
                <p className="mb-2 font-mono text-[9px] tracking-[0.14em] text-coral">
                  已选结构
                </p>
                {selected ? (
                  <>
                    <h2
                      data-testid="brain-selected-label"
                      className="text-xl font-semibold leading-tight text-zinc-900"
                    >
                      {selectedTerm?.primaryLabel}
                    </h2>
                    {selectedTerm?.chineseLabel && (
                      <p className="mt-1 text-xs text-zinc-500">
                        {selectedTerm.englishLabel}
                      </p>
                    )}
                    <p className="mt-2 font-mono text-[10px] text-zinc-400">
                      #{selected.id} · {selectedTerm?.sideChinese} ·{' '}
                      {selectedTerm?.categoryChinese}
                    </p>
                    <dl className="mt-5 space-y-3 text-xs">
                      <div>
                        <dt className="text-zinc-500">区域</dt>
                        <dd className="mt-1 text-zinc-700">
                          {getBrainRegionNameZh(selected.region)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500">来源元数据</dt>
                        <dd className="mt-1 text-zinc-700">
                          {selected.source}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500">层级</dt>
                        <dd className="mt-1 leading-5 text-zinc-600">
                          {localizeBrainHierarchy(selected.ta2).join(' › ')}
                        </dd>
                      </div>
                    </dl>
                  </>
                ) : (
                  <p className="text-xs leading-5 text-zinc-500">
                    请在 3D 场景中拾取结构，或从左侧列表中选择。
                  </p>
                )}
              </section>

              <section className="border-t border-zinc-200 pt-5">
                <p className="mb-3 font-mono text-[9px] tracking-[0.14em] text-zinc-400">
                  分类可见性
                </p>
                <p className="mb-3 text-[10px] leading-4 text-zinc-500">
                  血管与脑神经等图层默认隐藏，以获得更清晰、更低绘制量的总览。
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
                        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[11px] text-zinc-600 hover:bg-zinc-100"
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
                          <span className="truncate">
                            {getBrainCategoryNameZh(id) ?? item.label}
                          </span>
                        </span>
                        <span className="ml-2 font-mono text-[9px] text-zinc-400">
                          {visible ? '开' : '关'} · {item.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <label className="mt-4 block text-[11px] text-zinc-500">
                  皮层不透明度 · {Math.round(cortexOpacity * 100)}%
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

              <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-[11px] leading-5 text-zinc-600">
                <div className="mb-2 flex items-center gap-2 text-emerald-700">
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
                  className="mt-2 inline-flex items-center gap-1 text-emerald-700 underline underline-offset-2"
                >
                  <Info className="size-3" /> License and attribution
                </a>
                <p className="mt-2 text-zinc-500">
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
