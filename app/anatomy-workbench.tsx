'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  VanatomeViewer,
  useVanatomeController,
  type VanatomeAtlas,
  type VanatomeStructure,
} from '@vixotic/vanatome-react';
import {
  createOfficialHumanAtlas,
  type AtlasCatalog,
  type AtlasProvenance,
} from '@vixotic/vanatome-atlas';
import {
  Box,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Eye,
  EyeOff,
  Focus,
  Info,
  LoaderCircle,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  knowledgeNodes,
  scaleLabels,
  primaryModelStructureId,
  relationTypeLabels,
  type KnowledgeNode,
} from '@/lib/knowledge-nodes';
import {
  availableDisplayLayers,
  createFilteredAtlas,
  displayLayerOptions,
  matchesDisplayLayer,
  matchesSystem,
  systemFilterOptions,
  type AnatomySystemFilter,
  type DisplayLayerFilter,
} from '@/lib/anatomy-filters';
import {
  explorerPrimaryName,
  getStructureTerm,
  getSystemTerm,
} from '@/lib/anatomy-terminology';
import { resolvePickCandidates } from '@/lib/picking-manager';

const atlasLoader = createOfficialHumanAtlas();
const systemOrder = [
  'cardiovascular',
  'digestive',
  'endocrine',
  'lymphatic',
  'muscular',
  'nervous',
  'reproductive',
  'respiratory',
  'skeletal',
  'urinary',
  'regional-anatomy',
];
const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(' ');
const displaySystem = (id: string) =>
  getSystemTerm(id).zh ?? getSystemTerm(id).en;
const displayStructure = (structure: VanatomeStructure) =>
  explorerPrimaryName(structure);

export function AnatomyWorkbench({
  atlasSwitcher,
}: { atlasSwitcher?: ReactNode } = {}) {
  const viewer = useVanatomeController([]);
  const [atlas, setAtlas] = useState<VanatomeAtlas | null>(null);
  const [catalog, setCatalog] = useState<AtlasCatalog | null>(null);
  const [provenance, setProvenance] = useState<AtlasProvenance | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [query, setQuery] = useState('');
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(
    new Set(['cardiovascular']),
  );
  const [activeSystem, setActiveSystem] = useState<AnatomySystemFilter>('all');
  const [displayLayer, setDisplayLayer] = useState<DisplayLayerFilter>('mixed');
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [sceneReady, setSceneReady] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // Knowledge v0.2：知识与模型语境分离。
  // currentNodeId = 当前阅读的知识节点；modelContextId = 中央 3D 场景的语境。
  const [currentNodeId, setCurrentNodeId] = useState('human');
  const [modelContextId, setModelContextId] = useState('human');
  const [knowledgeHistory, setKnowledgeHistory] = useState<string[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [cameraLevel, setCameraLevel] = useState<
    'whole' | 'system' | 'structure'
  >('whole');
  const [cameraOwnership, setCameraOwnership] = useState<'auto' | 'manual'>(
    'manual',
  );
  const [candidateIds, setCandidateIds] = useState<string[]>([]);
  const selectAtlasStructure = viewer.select;

  useEffect(() => {
    const abortController = new AbortController();
    atlasLoader
      .loadProfile('full-body', { signal: abortController.signal })
      .then((bundle) => {
        setAtlas({
          ...bundle.atlas,
          modelUrl: '/models/z-anatomy-1.4.0-full-body.glb',
        } as VanatomeAtlas);
        setProvenance(bundle.provenance);
        return atlasLoader.loadCatalog({ signal: abortController.signal });
      })
      .then(setCatalog)
      .catch((error: unknown) => {
        if (!abortController.signal.aborted)
          setLoadError(
            error instanceof Error ? error.message : '无法加载人体图谱',
          );
      });
    return () => abortController.abort();
  }, [reloadKey]);

  const structureMap = useMemo(
    () => new Map(atlas?.structures.map((item) => [item.id, item]) ?? []),
    [atlas],
  );
  const selectedStructure = viewer.selectedId
    ? structureMap.get(viewer.selectedId)
    : undefined;
  const hoveredStructure = hoveredId ? structureMap.get(hoveredId) : undefined;

  const fallbackNode = useMemo<KnowledgeNode | null>(
    () =>
      selectedStructure
        ? {
            id: `model:${selectedStructure.id}`,
            nameZh: displayStructure(selectedStructure),
            nameEn: getStructureTerm(selectedStructure).en,
            translationStatus:
              getStructureTerm(selectedStructure).translationStatus,
            typeZh: selectedStructure.kind === 'organ' ? '器官' : '解剖结构',
            typeEn: selectedStructure.kind ?? 'Structure',
            scale: selectedStructure.kind === 'organ' ? 'organ' : 'human',
            system: selectedStructure.system,
            summary:
              '这是人体图谱中可识别的真实结构。该节点的本科知识内容尚未整理，可继续使用模型进行空间观察。',
            modelRef: selectedStructure.id,
          }
        : null,
    [selectedStructure],
  );
  const currentNode = currentNodeId.startsWith('model:')
    ? (fallbackNode ?? knowledgeNodes.human)
    : (knowledgeNodes[currentNodeId] ?? knowledgeNodes.human);
  const enabledDisplayLayers = useMemo(
    () => availableDisplayLayers(atlas?.structures ?? [], activeSystem),
    [activeSystem, atlas],
  );
  const viewerAtlas = useMemo<VanatomeAtlas | null>(() => {
    if (!atlas) return null;
    if (displayLayer === 'mixed' && activeSystem !== 'all') {
      return {
        ...atlas,
        structures: atlas.structures.map((structure) => ({
          ...structure,
          selectable: matchesSystem(structure, activeSystem)
            ? structure.selectable
            : false,
        })),
      };
    }
    return {
      ...atlas,
      structures: createFilteredAtlas(
        [...atlas.structures],
        activeSystem,
        displayLayer,
      ),
    };
  }, [activeSystem, atlas, displayLayer]);

  useEffect(() => {
    if (!atlas) return;
    const id = new URLSearchParams(window.location.search).get('anatomy');
    if (id && structureMap.has(id))
      queueMicrotask(() => {
        setCameraOwnership('auto');
        selectAtlasStructure(id);
        const initNodeId =
          id === 'heart' || id.startsWith('heart-') ? 'heart' : `model:${id}`;
        setCurrentNodeId(initNodeId);
        setModelContextId(initNodeId);
        const structure = structureMap.get(id);
        if (structure)
          setExpandedSystems((value) => new Set(value).add(structure.system));
      });
  }, [atlas, selectAtlasStructure, structureMap]);

  const selectStructure = useCallback(
    (id: string | null) => {
      if (id) setCameraOwnership('auto');
      selectAtlasStructure(id);
      const url = new URL(window.location.href);
      if (id) {
        const structure = structureMap.get(id);
        setCameraLevel(structure?.kind === 'system' ? 'system' : 'structure');
        url.searchParams.set('anatomy', id);
        const nodeId =
          id === 'heart' || id.startsWith('heart-') ? 'heart' : `model:${id}`;
        setCurrentNodeId(nodeId);
        setModelContextId(nodeId);
        if (structure) {
          setExpandedSystems((value) => new Set(value).add(structure.system));
        }
      } else {
        setCameraLevel('whole');
        url.searchParams.delete('anatomy');
        setCurrentNodeId('human');
        setModelContextId('human');
      }
      window.history.replaceState({}, '', url);
    },
    [selectAtlasStructure, structureMap],
  );

  useEffect(() => {
    if (!viewer.selectedId) return;
    const timer = window.setTimeout(() => setCameraOwnership('manual'), 460);
    return () => window.clearTimeout(timer);
  }, [viewer.focusRequestKey, viewer.selectedId]);

  const chooseKnowledgeNode = (id: string) => {
    const node = knowledgeNodes[id];
    if (!node) return;
    // 记录知识历史（用于「← 返回」），并把当前节点设为该知识节点。
    setKnowledgeHistory((history) => [...history, currentNodeId]);
    setCurrentNodeId(id);
    // 只有该知识节点自身绑定了 3D 结构时，才同步切换模型语境。
    // 无 3D 绑定的节点（如 ATP、氧气、线粒体）保持中央模型不变。
    const modelId = primaryModelStructureId(node);
    if (modelId && structureMap.has(modelId)) {
      setModelContextId(id);
      // 知识导航切换模型语境：仅同步选中高亮，不触发 Camera 自动聚焦。
      // （Focus 动画保留给用户在 3D 工作区的显式操作 / 聚焦按钮。）
      selectAtlasStructure(modelId);
      setCameraLevel(
        structureMap.get(modelId)?.kind === 'system' ? 'system' : 'structure',
      );
      const url = new URL(window.location.href);
      url.searchParams.set('anatomy', modelId);
      window.history.replaceState({}, '', url);
    }
  };

  const goBackKnowledge = () => {
    setKnowledgeHistory((history) => {
      if (!history.length) return history;
      const prev = history[history.length - 1];
      setCurrentNodeId(prev);
      return history.slice(0, -1);
    });
  };

  const modelContextNode =
    knowledgeNodes[modelContextId] ??
    (modelContextId.startsWith('model:')
      ? (fallbackNode ?? knowledgeNodes.human)
      : knowledgeNodes.human);

  const structuresBySystem = useMemo(() => {
    const result = new Map<string, VanatomeStructure[]>();
    for (const structure of atlas?.structures ?? []) {
      if (structure.kind === 'system' || structure.selectable === false)
        continue;
      const items = result.get(structure.system) ?? [];
      items.push(structure);
      result.set(structure.system, items);
    }
    return result;
  }, [atlas]);
  const searchResults = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return (atlas?.structures ?? [])
      .filter(
        (item) =>
          item.selectable !== false &&
          (item.name.toLowerCase().includes(term) ||
            item.id.toLowerCase().includes(term) ||
            displayStructure(item).toLowerCase().includes(term)),
      )
      .slice(0, 60);
  }, [atlas, query]);
  const systems = useMemo(
    () =>
      [
        ...new Set([
          ...systemOrder,
          ...(catalog?.systems.map((item) => item.id) ?? []),
        ]),
      ].filter((id) => structuresBySystem.has(id)),
    [catalog, structuresBySystem],
  );

  const focusSelected = () => {
    if (viewer.selectedId) {
      setCameraOwnership('auto');
      viewer.focus();
      setFocusedId(viewer.selectedId);
      setCameraLevel(
        structureMap.get(viewer.selectedId)?.kind === 'system'
          ? 'system'
          : 'structure',
      );
    }
  };
  const hideSelected = () => {
    if (viewer.selectedId) {
      setHiddenIds((ids) => [...new Set([...ids, viewer.selectedId!])]);
      selectStructure(null);
    }
  };
  const changeSystem = (system: AnatomySystemFilter) => {
    setActiveSystem(system);
    setCandidateIds([]);
    setHoveredId(null);
    const expanded =
      system === 'musculoskeletal'
        ? ['muscular', 'skeletal']
        : system === 'all'
          ? []
          : [system];
    if (expanded.length) setExpandedSystems(new Set(expanded));
    if (
      !availableDisplayLayers(atlas?.structures ?? [], system).has(displayLayer)
    )
      setDisplayLayer('mixed');
    if (system === 'all') {
      selectStructure(null);
      viewer.reset();
      setCameraLevel('whole');
      return;
    }
    const systemRootId =
      system === 'musculoskeletal' ? 'muscular-system' : `${system}-system`;
    if (structureMap.has(systemRootId)) {
      // 系统节点的后代集合正是当前系统的真实几何范围；查看器会用其 bounding box 一次性构图。
      selectStructure(systemRootId);
      setCameraLevel('system');
      return;
    }
    const selected = viewer.selectedId
      ? structureMap.get(viewer.selectedId)
      : undefined;
    if (selected && !matchesSystem(selected, system)) selectStructure(null);
  };
  const changeDisplayLayer = (layer: DisplayLayerFilter) => {
    if (!enabledDisplayLayers.has(layer)) return;
    setDisplayLayer(layer);
    setCandidateIds([]);
    setHoveredId(null);
    const selected = viewer.selectedId
      ? structureMap.get(viewer.selectedId)
      : undefined;
    if (selected && !matchesDisplayLayer(selected, layer))
      selectStructure(null);
  };
  const resolveModelPick = useCallback(
    (id: string | null) =>
      resolvePickCandidates({
        structures: viewerAtlas?.structures ?? [],
        hitId: id,
        activeSystem,
        displayLayer,
        selectedId: viewer.selectedId,
        hiddenIds,
        isolation: viewer.isolation,
      }),
    [
      activeSystem,
      displayLayer,
      hiddenIds,
      viewer.isolation,
      viewer.selectedId,
      viewerAtlas,
    ],
  );
  const handleViewerSelect = (id: string | null) => {
    if (!id) {
      setCandidateIds([]);
      selectStructure(null);
      return;
    }
    const resolution = resolveModelPick(id);
    if (!resolution.primary) return;
    if (resolution.ambiguous) {
      setCandidateIds(resolution.candidates.map((item) => item.id));
    } else {
      setCandidateIds([]);
      selectStructure(resolution.primary.id);
    }
  };
  const resetAll = () => {
    viewer.reset();
    setHiddenIds([]);
    setDisplayLayer('mixed');
    setActiveSystem('all');
    setHoveredId(null);
    setFocusedId(null);
    setCameraLevel('whole');
    setCameraOwnership('auto');
    setCandidateIds([]);
    setCurrentNodeId('human');
    setModelContextId('human');
    setKnowledgeHistory([]);
    const url = new URL(window.location.href);
    url.searchParams.delete('anatomy');
    window.history.replaceState({}, '', url);
  };
  const retryAtlas = () => {
    setLoadError(null);
    setProgress(0);
    setSceneReady(false);
    setReloadKey((key) => key + 1);
  };

  return (
    <main className="flex min-h-screen flex-col overflow-hidden bg-[#0a0a09] text-zinc-100">
      <TopNavigation
        atlasSwitcher={atlasSwitcher}
        currentNode={currentNode}
        selectedStructure={selectedStructure}
        query={query}
        setQuery={setQuery}
        reset={resetAll}
        cameraLevel={cameraLevel}
        returnToSystem={changeSystem}
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_auto_auto_auto] lg:grid-cols-[270px_minmax(460px,1fr)_350px] lg:grid-rows-[minmax(0,1fr)_96px]">
        <ExplorerPanel
          systems={systems}
          structuresBySystem={structuresBySystem}
          searchResults={searchResults}
          query={query}
          setQuery={setQuery}
          expandedSystems={expandedSystems}
          setExpandedSystems={setExpandedSystems}
          activeSystem={activeSystem}
          selectedId={viewer.selectedId}
          selectStructure={selectStructure}
          selectSystem={changeSystem}
        />
        <VisualWorkspace
          atlas={viewerAtlas}
          reloadKey={reloadKey}
          loadError={loadError}
          progress={progress}
          sceneReady={sceneReady}
          hoveredStructure={hoveredStructure}
          selectedStructure={selectedStructure}
          activeSystem={activeSystem}
          cameraLevel={cameraLevel}
          cameraOwnership={cameraOwnership}
          displayLayer={displayLayer}
          enabledDisplayLayers={enabledDisplayLayers}
          hiddenIds={hiddenIds}
          viewer={viewer}
          onCameraInteraction={() => setCameraOwnership('manual')}
          setProgress={setProgress}
          setSceneReady={setSceneReady}
          setLoadError={setLoadError}
          setHoveredId={setHoveredId}
          selectStructure={handleViewerSelect}
          setDisplayLayer={changeDisplayLayer}
          changeSystem={changeSystem}
          focusSelected={focusSelected}
          hideSelected={hideSelected}
          restoreHidden={() => setHiddenIds([])}
          reset={resetAll}
          retry={retryAtlas}
          focusedId={focusedId}
          candidateIds={candidateIds}
          resolvePick={resolveModelPick}
          structureMap={structureMap}
          chooseCandidate={(id) => {
            setCandidateIds([]);
            selectStructure(id);
          }}
          dismissCandidates={() => setCandidateIds([])}
        />
        <KnowledgePanel
          node={currentNode}
          modelContextNode={modelContextNode}
          hasModelContext={
            currentNodeId !== modelContextId &&
            knowledgeNodes[modelContextId] !== undefined
          }
          history={knowledgeHistory}
          provenance={provenance}
          structureMap={structureMap}
          selectStructure={selectStructure}
          chooseNode={chooseKnowledgeNode}
          goBack={goBackKnowledge}
          focusSelected={focusSelected}
          isolate={() =>
            selectedStructure &&
            viewer.isolate(selectedStructure.id, 'parent-context')
          }
        />
        <RelatedKnowledgeDock
          node={currentNode}
          chooseNode={chooseKnowledgeNode}
        />
      </div>
    </main>
  );
}

function TopNavigation({
  atlasSwitcher,
  currentNode,
  selectedStructure,
  query,
  setQuery,
  reset,
  cameraLevel,
  returnToSystem,
}: {
  atlasSwitcher?: ReactNode;
  currentNode: KnowledgeNode;
  selectedStructure?: VanatomeStructure;
  query: string;
  setQuery: (value: string) => void;
  reset: () => void;
  cameraLevel: 'whole' | 'system' | 'structure';
  returnToSystem: (system: AnatomySystemFilter) => void;
}) {
  const breadcrumb =
    selectedStructure?.kind === 'system'
      ? ['人体', displayStructure(selectedStructure)]
      : selectedStructure
        ? [
            '人体',
            displaySystem(selectedStructure.system),
            displayStructure(selectedStructure),
          ]
        : currentNode.id === 'human'
          ? ['人体']
          : ['人体', currentNode.nameZh];
  return (
    <header className="grid min-h-16 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-5 border-b border-white/10 px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <div className="grid size-8 place-items-center rounded-full border border-coral/50 bg-coral/10 font-mono text-[10px] font-semibold text-coral">
          BIO
        </div>
        <div>
          <p className="text-sm font-semibold">BioScope</p>
          <p className="hidden font-mono text-[8px] tracking-[0.18em] text-zinc-600 sm:block">
            VISUAL BIOLOGY EXPLORER
          </p>
        </div>
      </div>
      <div className="hidden min-w-0 items-center justify-center gap-4 lg:flex">
        <div className="relative w-full max-w-64">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-600" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索结构、器官或系统"
            className="h-8 border-white/10 bg-white/[0.025] pl-8 text-xs"
          />
        </div>
        <nav
          aria-label="当前位置"
          className="flex shrink-0 items-center gap-1 text-[11px] text-zinc-600"
        >
          {breadcrumb.map((item, index) => (
            <span className="flex items-center gap-1" key={`${item}-${index}`}>
              {index > 0 && <ChevronRight className="size-3" />}
              {index === 0 ? (
                <button
                  type="button"
                  onClick={reset}
                  className="hover:text-zinc-300"
                >
                  {item}
                </button>
              ) : index === 1 &&
                cameraLevel === 'structure' &&
                selectedStructure ? (
                <button
                  type="button"
                  onClick={() =>
                    returnToSystem(
                      selectedStructure.system === 'muscular' ||
                        selectedStructure.system === 'skeletal'
                        ? 'musculoskeletal'
                        : (selectedStructure.system as AnatomySystemFilter),
                    )
                  }
                  className="hover:text-zinc-300"
                >
                  {item}
                </button>
              ) : (
                <span
                  className={
                    index === breadcrumb.length - 1 ? 'text-zinc-300' : ''
                  }
                >
                  {item}
                </span>
              )}
            </span>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {atlasSwitcher}
        <ScaleNavigator current={currentNode.scale} />
        <Button variant="ghost" size="icon-sm" onClick={reset} title="重置视图">
          <RotateCcw />
        </Button>
      </div>
    </header>
  );
}

function ScaleNavigator({ current }: { current: KnowledgeNode['scale'] }) {
  return (
    <div className="hidden items-center xl:flex">
      {scaleLabels.map((scale, index) => (
        <div className="flex items-center" key={scale.id}>
          {index > 0 && <span className="mx-1.5 h-px w-3 bg-white/10" />}
          <button
            type="button"
            disabled={!scale.enabled}
            title={
              scale.enabled ? scale.zh : `${scale.zh} · 该尺度模型尚未加入`
            }
            className={cn(
              'relative py-3 font-mono text-[9px] tracking-[0.12em]',
              current === scale.id
                ? 'text-coral'
                : scale.enabled
                  ? 'text-zinc-500'
                  : 'cursor-not-allowed text-zinc-800',
            )}
          >
            {scale.en}
            {current === scale.id && (
              <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-coral" />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}

type ExplorerProps = {
  systems: string[];
  structuresBySystem: Map<string, VanatomeStructure[]>;
  searchResults: VanatomeStructure[];
  query: string;
  setQuery: (value: string) => void;
  expandedSystems: Set<string>;
  setExpandedSystems: React.Dispatch<React.SetStateAction<Set<string>>>;
  activeSystem: AnatomySystemFilter;
  selectedId: string | null;
  selectStructure: (id: string | null) => void;
  selectSystem: (id: AnatomySystemFilter) => void;
};
function ExplorerPanel({
  systems,
  structuresBySystem,
  searchResults,
  query,
  setQuery,
  expandedSystems,
  setExpandedSystems,
  activeSystem,
  selectedId,
  selectStructure,
  selectSystem,
}: ExplorerProps) {
  const toggle = (id: string) =>
    setExpandedSystems((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const visibleSystems =
    activeSystem === 'all'
      ? systems
      : activeSystem === 'musculoskeletal'
        ? ['muscular', 'skeletal']
        : [activeSystem];
  return (
    <aside className="order-2 flex min-h-[540px] flex-col border-white/10 lg:order-1 lg:min-h-0 lg:border-r">
      <div className="border-b border-white/10 p-4">
        <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.18em] text-coral">
          01 / Explorer
        </p>
        <div className="relative lg:hidden">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索结构、器官或系统"
            className="h-9 bg-white/[0.025] pl-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <p className="mt-3 font-mono text-[8px] tracking-[0.16em] text-zinc-700">
          解剖结构
        </p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="py-3">
          {query ? (
            searchResults
              .filter((item) => matchesSystem(item, activeSystem))
              .map((structure) => (
                <TreeStructure
                  key={structure.id}
                  structure={structure}
                  depth={0}
                  selected={selectedId === structure.id}
                  onSelect={selectStructure}
                />
              ))
          ) : (
            <>
              <button
                type="button"
                onClick={() => selectSystem('all')}
                className={cn(
                  'flex w-full items-center gap-2 px-4 py-2.5 text-left',
                  activeSystem === 'all'
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-white',
                )}
              >
                <ChevronDown className="size-3.5" />
                <span className="text-sm">人体</span>
                <span className="ml-auto text-[10px] text-zinc-600">
                  Human Body
                </span>
              </button>
              <div className="ml-5 border-l border-white/10 pb-2">
                {visibleSystems.map((system) => {
                  const expanded = expandedSystems.has(system);
                  const list = structuresBySystem.get(system) ?? [];
                  const term = getSystemTerm(system);
                  return (
                    <div key={system}>
                      <div
                        className={cn(
                          'group flex items-center pr-3',
                          (activeSystem === system ||
                            (activeSystem === 'musculoskeletal' &&
                              (system === 'muscular' ||
                                system === 'skeletal'))) &&
                            'bg-white/[0.025]',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggle(system)}
                          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-zinc-400 hover:text-white"
                        >
                          {expanded ? (
                            <ChevronDown className="size-3 shrink-0" />
                          ) : (
                            <ChevronRight className="size-3 shrink-0" />
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-xs">
                              {term.zh ?? term.en}
                            </span>
                            {term.zh && (
                              <span className="block truncate text-[9px] text-zinc-700">
                                {term.en}
                              </span>
                            )}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            selectSystem(
                              system === 'muscular' || system === 'skeletal'
                                ? 'musculoskeletal'
                                : (system as AnatomySystemFilter),
                            )
                          }
                          className="text-[10px] text-zinc-700 hover:text-coral"
                        >
                          显示
                        </button>
                      </div>
                      {expanded && (
                        <div className="ml-5 border-l border-white/10">
                          {list.slice(0, 36).map((structure) => (
                            <TreeStructure
                              key={structure.id}
                              structure={structure}
                              depth={1}
                              selected={selectedId === structure.id}
                              onSelect={selectStructure}
                            />
                          ))}
                          {list.length > 36 && (
                            <p className="px-4 py-2 text-[10px] text-zinc-700">
                              搜索以浏览其余 {list.length - 36} 个结构
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
function TreeStructure({
  structure,
  depth,
  selected,
  onSelect,
}: {
  structure: VanatomeStructure;
  depth: number;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const term = getStructureTerm(structure);
  return (
    <button
      type="button"
      title={term.en}
      onClick={() => onSelect(structure.id)}
      className={cn(
        'flex w-full items-center gap-2 border-l px-3 py-1.5 text-left transition-colors',
        selected
          ? 'border-coral bg-coral/[0.08] text-white'
          : 'border-transparent text-zinc-500 hover:text-zinc-100',
      )}
      style={{ paddingLeft: 12 + depth * 8 }}
    >
      <span
        className={cn(
          'size-1 shrink-0 rounded-full',
          selected ? 'bg-coral' : 'bg-zinc-700',
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px]">
          {displayStructure(structure)}
        </span>
        {term.level === 'major' && term.zh && (
          <span className="block truncate text-[9px] text-zinc-700">
            {term.en}
          </span>
        )}
      </span>
    </button>
  );
}

type WorkspaceProps = {
  atlas: VanatomeAtlas | null;
  reloadKey: number;
  loadError: string | null;
  progress: number;
  sceneReady: boolean;
  hoveredStructure?: VanatomeStructure;
  selectedStructure?: VanatomeStructure;
  activeSystem: AnatomySystemFilter;
  cameraLevel: 'whole' | 'system' | 'structure';
  cameraOwnership: 'auto' | 'manual';
  displayLayer: DisplayLayerFilter;
  enabledDisplayLayers: Set<DisplayLayerFilter>;
  hiddenIds: string[];
  viewer: ReturnType<typeof useVanatomeController>;
  onCameraInteraction: () => void;
  setProgress: (v: number) => void;
  setSceneReady: (v: boolean) => void;
  setLoadError: (v: string | null) => void;
  setHoveredId: (v: string | null) => void;
  selectStructure: (id: string | null) => void;
  setDisplayLayer: (v: DisplayLayerFilter) => void;
  changeSystem: (v: AnatomySystemFilter) => void;
  focusSelected: () => void;
  hideSelected: () => void;
  restoreHidden: () => void;
  reset: () => void;
  retry: () => void;
  focusedId: string | null;
  candidateIds: string[];
  resolvePick: (id: string | null) => ReturnType<typeof resolvePickCandidates>;
  structureMap: Map<string, VanatomeStructure>;
  chooseCandidate: (id: string) => void;
  dismissCandidates: () => void;
};
function VisualWorkspace(props: WorkspaceProps) {
  const {
    atlas,
    reloadKey,
    loadError,
    progress,
    sceneReady,
    hoveredStructure,
    selectedStructure,
    activeSystem,
    cameraLevel,
    cameraOwnership,
    displayLayer,
    enabledDisplayLayers,
    hiddenIds,
    viewer,
    onCameraInteraction,
    setProgress,
    setSceneReady,
    setLoadError,
    setHoveredId,
    selectStructure,
    setDisplayLayer,
    changeSystem,
    focusSelected,
    hideSelected,
    restoreHidden,
    reset,
    retry,
    candidateIds,
    resolvePick,
    structureMap,
    chooseCandidate,
    dismissCandidates,
  } = props;
  const systemRootId =
    activeSystem === 'all'
      ? null
      : activeSystem === 'musculoskeletal'
        ? 'muscular-system'
        : `${activeSystem}-system`;
  const emphasisId =
    hoveredStructure?.id ?? (displayLayer === 'mixed' ? systemRootId : null);
  const hoverTimer = useRef<number | null>(null);
  const [pointer, setPointer] = useState({ x: 36, y: 150 });
  useEffect(
    () => () => {
      if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    },
    [],
  );
  const handleHover = useCallback(
    (id: string | null) => {
      if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
      const target = resolvePick(id).primary?.id ?? null;
      hoverTimer.current = window.setTimeout(() => setHoveredId(target), 110);
    },
    [resolvePick, setHoveredId],
  );
  return (
    <section
      className="relative order-1 min-h-[650px] overflow-hidden bg-[radial-gradient(circle_at_50%_48%,#242321_0%,#111210_48%,#0a0a09_78%)] lg:order-2 lg:min-h-0"
      onDoubleClick={focusSelected}
      onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        setPointer({
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        });
      }}
    >
      <div className="absolute left-4 top-3 z-20 right-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
              02 / Visual Workspace
            </p>
            <p className="mt-1 text-[10px] text-zinc-600">
              系统决定生物学归属 · 显示层决定结构类型
            </p>
            <p className="mt-1 font-mono text-[9px] tracking-[0.14em] text-coral/70">
              {cameraLevel === 'whole'
                ? 'WHOLE BODY / 全身观察'
                : cameraLevel === 'system'
                  ? 'SYSTEM FRAME / 系统构图'
                  : 'STRUCTURE FOCUS / 结构聚焦'}{' '}
              · {cameraOwnership === 'auto' ? 'AUTO FIT' : 'USER CONTROL'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-black/55 p-2 backdrop-blur-md">
          <FilterControl
            label="系统"
            options={systemFilterOptions}
            value={activeSystem}
            onChange={(value) => changeSystem(value as AnatomySystemFilter)}
          />
          <span className="hidden h-7 w-px bg-white/10 md:block" />
          <FilterControl
            label="显示层"
            options={displayLayerOptions}
            value={displayLayer}
            onChange={(value) => setDisplayLayer(value as DisplayLayerFilter)}
            enabled={enabledDisplayLayers}
          />
        </div>
      </div>
      <div className="absolute inset-0 z-10 pt-24">
        {loadError ? (
          <LoadFailure message={loadError} retry={retry} />
        ) : atlas ? (
          <VanatomeViewer
            key={reloadKey}
            atlas={atlas}
            selectedId={viewer.selectedId}
            hoveredId={emphasisId}
            isolation={viewer.isolation}
            visibleLayers={[]}
            hiddenIds={hiddenIds}
            displayMode={
              displayLayer === 'mixed' && activeSystem !== 'all'
                ? 'ghost'
                : 'normal'
            }
            focusRequestKey={viewer.focusRequestKey}
            resetViewKey={viewer.resetViewKey}
            enablePan
            initialCameraPosition={[0, 0, 7]}
            focusDistance={0.4}
            focusPadding={1.3}
            minDistance={0.18}
            maxDistance={38}
            cameraAnimationDuration={380}
            appearance={{
              bodyShellId: '__neutral_shell__',
              skeletonId: '__neutral_skeleton__',
              defaultOpacity: 0.72,
              xrayOpacity: 0.2,
              ghostOpacity: 0.1,
              parentContextOpacity: 0.12,
              hoverEmissiveIntensity: 0.55,
              selectedEmissiveIntensity: 0.9,
            }}
            onHover={handleHover}
            onSelect={selectStructure}
            onInteractionStart={onCameraInteraction}
            onEscape={() => selectStructure(null)}
            onLoadProgress={({ percentage }) =>
              setProgress(Math.round(percentage))
            }
            onReady={() => {
              setSceneReady(true);
              setProgress(100);
            }}
            onError={(error) => setLoadError(error.message)}
            ariaLabel="可交互的生命科学模型工作区"
            loadingFallback={<ModelLoading progress={progress} />}
            errorFallback={(error) => (
              <LoadFailure message={error.message} retry={retry} />
            )}
          />
        ) : (
          <ModelLoading progress={progress} />
        )}
      </div>
      {hoveredStructure && (
        <div
          className="pointer-events-none absolute z-20 flex items-center gap-2"
          style={{
            left: Math.min(pointer.x + 18, 560),
            top: Math.max(112, pointer.y - 38),
          }}
        >
          <span className="h-px w-7 bg-coral/50" />
          <div className="rounded-lg border border-white/10 bg-black/75 px-3 py-2 backdrop-blur">
            <p className="text-xs text-white">
              {displayStructure(hoveredStructure)}
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-500">
              {getStructureTerm(hoveredStructure).en}
            </p>
          </div>
        </div>
      )}
      {candidateIds.length > 1 && (
        <CandidateMenu
          ids={candidateIds}
          structureMap={structureMap}
          choose={chooseCandidate}
          close={dismissCandidates}
          point={pointer}
        />
      )}{' '}
      {sceneReady && (
        <ViewerControls
          selected={!!selectedStructure}
          hidden={hiddenIds.length > 0}
          fadeActive={viewer.isolation?.mode === 'parent-context'}
          isolateActive={viewer.isolation?.mode === 'selected'}
          focus={focusSelected}
          fade={() =>
            selectedStructure &&
            viewer.isolate(selectedStructure.id, 'parent-context')
          }
          isolate={() =>
            selectedStructure &&
            viewer.isolate(selectedStructure.id, 'selected')
          }
          hide={hideSelected}
          restore={restoreHidden}
          reset={reset}
        />
      )}
    </section>
  );
}

function FilterControl({
  label,
  options,
  value,
  onChange,
  enabled,
}: {
  label: string;
  options: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
  enabled?: Set<string>;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="mr-1 shrink-0 text-[9px] text-zinc-600">{label}</span>
      <div className="flex min-w-0 flex-wrap gap-1">
        {options.map((option) => {
          const available = !enabled || enabled.has(option.id);
          return (
            <button
              type="button"
              key={option.id}
              disabled={!available}
              title={
                available
                  ? `${label}：${option.label}`
                  : `当前系统没有${option.label}数据`
              }
              onClick={() => onChange(option.id)}
              className={cn(
                'rounded-md px-2 py-1 text-[9px] transition-colors',
                value === option.id
                  ? 'bg-zinc-200 text-zinc-950'
                  : available
                    ? 'bg-white/[0.035] text-zinc-500 hover:bg-white/[0.08] hover:text-white'
                    : 'cursor-not-allowed bg-transparent text-zinc-800 line-through',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
function CandidateMenu({
  ids,
  structureMap,
  choose,
  close,
  point,
}: {
  ids: string[];
  structureMap: Map<string, VanatomeStructure>;
  choose: (id: string) => void;
  close: () => void;
  point: { x: number; y: number };
}) {
  return (
    <div
      className="absolute z-30 w-56 rounded-xl border border-white/10 bg-[#111210]/95 p-2 shadow-2xl backdrop-blur"
      style={{
        left: Math.min(point.x + 14, 500),
        top: Math.max(116, point.y + 14),
      }}
    >
      <div className="mb-1 flex items-center justify-between px-2 py-1">
        <p className="text-[10px] text-zinc-500">请选择目标结构</p>
        <button
          type="button"
          onClick={close}
          className="text-zinc-600 hover:text-white"
        >
          <X className="size-3.5" />
        </button>
      </div>
      {ids.map((id) => {
        const item = structureMap.get(id);
        if (!item) return null;
        const term = getStructureTerm(item);
        return (
          <button
            type="button"
            key={id}
            onClick={() => choose(id)}
            className="w-full rounded-lg px-2 py-2 text-left hover:bg-white/[0.06]"
          >
            <span className="block text-xs text-zinc-300">
              {displayStructure(item)}
            </span>
            <span className="text-[10px] text-zinc-600">
              {term.en} · {displaySystem(item.system)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
function ViewerControls({
  selected,
  hidden,
  fadeActive,
  isolateActive,
  focus,
  fade,
  isolate,
  hide,
  restore,
  reset,
}: {
  selected: boolean;
  hidden: boolean;
  fadeActive: boolean;
  isolateActive: boolean;
  focus: () => void;
  fade: () => void;
  isolate: () => void;
  hide: () => void;
  restore: () => void;
  reset: () => void;
}) {
  return (
    <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-white/10 bg-black/65 p-1.5 backdrop-blur">
      <Button variant="ghost" size="sm" onClick={focus} disabled={!selected}>
        <Focus />
        聚焦
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={fade}
        disabled={!selected}
        aria-pressed={fadeActive}
        className={cn(
          fadeActive &&
            'bg-coral/15 text-coral ring-1 ring-coral/50 hover:bg-coral/25 hover:text-coral',
        )}
      >
        <Sparkles />
        保留语境
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={isolate}
        disabled={!selected}
        aria-pressed={isolateActive}
        className={cn(
          isolateActive &&
            'bg-coral/15 text-coral ring-1 ring-coral/50 hover:bg-coral/25 hover:text-coral',
        )}
      >
        <Box />
        隔离
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={hide}
        disabled={!selected}
        title="隐藏"
      >
        <EyeOff />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={restore}
        disabled={!hidden}
        title="恢复隐藏"
      >
        <Eye />
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={reset} title="重置">
        <RotateCcw />
      </Button>
    </div>
  );
}

function KnowledgePanel({
  node,
  modelContextNode,
  hasModelContext,
  history,
  provenance,
  structureMap,
  selectStructure,
  chooseNode,
  goBack,
  focusSelected,
  isolate,
}: {
  node: KnowledgeNode;
  modelContextNode: KnowledgeNode;
  hasModelContext: boolean;
  history: string[];
  provenance: AtlasProvenance | null;
  structureMap: Map<string, VanatomeStructure>;
  selectStructure: (id: string) => void;
  chooseNode: (id: string) => void;
  goBack: () => void;
  focusSelected: () => void;
  isolate: () => void;
}) {
  return (
    <aside className="order-3 flex min-h-[600px] flex-col border-t border-white/10 lg:min-h-0 lg:border-l lg:border-t-0">
      <div className="border-b border-white/10 p-5">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-coral">
          03 / Knowledge
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">
          {node.nameZh}
        </h2>
        <p className="mt-1 text-[10px] tracking-[0.1em] text-zinc-600">
          {node.nameEn}
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          {node.typeZh} · {node.typeEn}
          {node.system ? `　${displaySystem(node.system)}` : ''}
        </p>
        {primaryModelStructureId(node) && (
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={focusSelected}>
              <Focus />
              Focus
            </Button>
            <Button variant="outline" size="sm" onClick={isolate}>
              <Sparkles />
              Fade context
            </Button>
          </div>
        )}
        {hasModelContext && modelContextNode.id !== node.id && (
          <div className="mt-3 rounded-lg border border-coral/25 bg-coral/[0.04] px-3 py-2">
            <p className="text-[9px] tracking-[0.12em] text-coral">
              当前模型语境
            </p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-xs text-zinc-200">
                {modelContextNode.nameZh}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => chooseNode(modelContextNode.id)}
                className="shrink-0 text-[10px]"
              >
                返回{modelContextNode.nameZh}
              </Button>
            </div>
          </div>
        )}
        {history.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              className="text-[10px]"
            >
              <ChevronRight className="size-3 rotate-180" />
              返回
            </Button>
            <span className="truncate text-[10px] text-zinc-600">
              {knowledgeNodes[history[history.length - 1]]?.nameZh ??
                '上一知识'}
            </span>
          </div>
        )}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-5">
          <KnowledgeSection index="01" title="WHAT IS IT?" zh="它是什么？">
            <p>{node.summary}</p>
          </KnowledgeSection>
          <KnowledgeSection index="02" title="WHERE IS IT?" zh="它在哪里？">
            <p>
              {node.location ??
                (primaryModelStructureId(node)
                  ? '可在中央三维人体模型中定位该结构。'
                  : '这是一个知识节点，当前没有独立三维模型。')}
            </p>
          </KnowledgeSection>
          <KnowledgeSection index="03" title="WHAT DOES IT DO?" zh="它做什么？">
            <ul>
              {(node.coreFunctions ?? ['知识内容待继续整理'])
                .slice(0, 3)
                .map((item) => (
                  <li key={item}>{item}</li>
                ))}
            </ul>
          </KnowledgeSection>
          <KnowledgeSection
            index="04"
            title="HOW DOES IT WORK?"
            zh="它怎么工作？"
          >
            <p>{node.mechanism ?? '核心机制将在后续知识整理中补充。'}</p>
          </KnowledgeSection>
          <KnowledgeSection index="05" title="KEY STRUCTURES" zh="关键结构">
            <div className="grid grid-cols-2 gap-2">
              {(node.keyStructures ?? []).slice(0, 5).map((item) => {
                const hasModel =
                  !!item.modelRef && structureMap.has(item.modelRef);
                const hasKnowledge =
                  !!item.id && knowledgeNodes[item.id] !== undefined;
                return (
                  <button
                    type="button"
                    disabled={!hasModel && !hasKnowledge}
                    onClick={() => {
                      if (hasModel && item.modelRef) {
                        selectStructure(item.modelRef);
                      } else if (hasKnowledge && item.id) {
                        chooseNode(item.id);
                      }
                    }}
                    key={item.nameEn ?? item.nameZh}
                    className={cn(
                      'rounded-lg border border-white/10 p-2 text-left',
                      hasModel || hasKnowledge
                        ? 'hover:border-coral/40 hover:bg-coral/[0.05]'
                        : 'cursor-default opacity-50',
                    )}
                  >
                    <span className="block text-[11px]">{item.nameZh}</span>
                    <span className="text-[10px] text-zinc-600">
                      {item.nameEn}
                      {!hasModel && !hasKnowledge && ' · 暂无模型'}
                      {hasKnowledge && !hasModel && ' · 了解'}
                    </span>
                  </button>
                );
              })}
              {!node.keyStructures?.length && (
                <p className="col-span-2 text-zinc-600">
                  暂无可映射的关键结构。
                </p>
              )}
            </div>
          </KnowledgeSection>
          <KnowledgeSection
            index="06"
            title="WHY SHOULD I CARE?"
            zh="为什么值得理解？"
          >
            <p>
              {node.whyItMatters ??
                '理解这个节点可以继续连接它所在的生命尺度、相关结构与核心生理机制。'}
            </p>
          </KnowledgeSection>
          {node.exploreQuestions && (
            <section className="mt-6 border-t border-white/10 pt-5">
              <p className="mb-3 font-mono text-[9px] tracking-[0.16em] text-zinc-600">
                EXPLORE / 探索问题
              </p>
              {(
                [
                  ['why', 'WHY'],
                  ['how', 'HOW'],
                  ['whatIf', 'WHAT IF'],
                ] as const
              ).map(([kind, en]) => {
                const question = node.exploreQuestions?.[kind];
                if (!question) return null;
                return (
                  <details
                    key={kind}
                    className="group border-b border-white/10 py-2"
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-3 text-xs">
                      <span className="w-12 shrink-0 font-mono text-[9px] uppercase text-coral">
                        {en}
                      </span>
                      <span className="text-zinc-400 group-open:text-white">
                        {question.question}
                      </span>
                    </summary>
                    <p className="mt-2 pl-15 text-[11px] leading-5 text-zinc-500">
                      {question.answer}
                    </p>
                    {question.followUps && question.followUps.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 pl-15">
                        {question.followUps.map((id) => {
                          const target = knowledgeNodes[id];
                          if (!target) return null;
                          return (
                            <button
                              type="button"
                              key={id}
                              onClick={() => chooseNode(id)}
                              className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400 hover:border-coral/40 hover:text-white"
                            >
                              {target.nameZh}
                              <ChevronRight className="ml-0.5 inline size-3" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </details>
                );
              })}
            </section>
          )}
          <button
            type="button"
            disabled
            className="mt-5 w-full cursor-not-allowed rounded-lg border border-dashed border-white/10 px-3 py-3 text-left"
          >
            <span className="block text-xs text-zinc-500">
              深入下一尺度 · Explore deeper
            </span>
            <span className="mt-1 block text-[10px] text-zinc-700">
              该尺度模型尚未加入
            </span>
          </button>
          <LicenseNote provenance={provenance} />
        </div>
      </ScrollArea>
    </aside>
  );
}
function KnowledgeSection({
  index,
  title,
  zh,
  children,
}: {
  index: string;
  title: string;
  zh: string;
  children: React.ReactNode;
}) {
  return (
    <details
      open={index === '01' || index === '03' || index === '04'}
      className="group border-b border-white/10 py-3"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2">
        <span className="font-mono text-[9px] text-coral">{index}</span>
        <span className="text-xs text-zinc-200">{zh}</span>
        <span className="ml-auto font-mono text-[8px] tracking-[0.1em] text-zinc-600">
          {title}
        </span>
        <ChevronDown className="size-3 text-zinc-700 transition-transform group-open:rotate-180" />
      </summary>
      <div className="pt-3 text-xs leading-5 text-zinc-400 [&_li]:ml-4 [&_li]:list-disc">
        {children}
      </div>
    </details>
  );
}
function LicenseNote({ provenance }: { provenance: AtlasProvenance | null }) {
  return (
    <div className="mt-5 flex gap-2 border-t border-white/10 pt-4 text-[10px] leading-4 text-zinc-700">
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <div>
        <p>仅供生命科学学习，不用于诊断或治疗决策。</p>
        <a
          className="hover:text-zinc-400"
          href={
            provenance?.licenseUrl ??
            'https://creativecommons.org/licenses/by-sa/4.0/'
          }
          target="_blank"
          rel="noreferrer"
        >
          模型：{provenance?.sourceName ?? 'Z-Anatomy'} ·{' '}
          {provenance?.licenseName ?? 'CC BY-SA 4.0'}
        </a>
      </div>
    </div>
  );
}

function RelatedKnowledgeDock({
  node,
  chooseNode,
}: {
  node: KnowledgeNode;
  chooseNode: (id: string) => void;
}) {
  const related = (node.related ?? [])
    .map((relation) => {
      const target = knowledgeNodes[relation.targetId];
      return target ? { ...relation, node: target } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .slice(0, 5);
  return (
    <section className="order-4 border-t border-white/10 bg-[#0d0e0c] px-4 py-3 lg:col-span-3 lg:row-start-2 lg:px-6">
      <div className="flex h-full items-center gap-4">
        <div className="w-28 shrink-0">
          <p className="font-mono text-[9px] tracking-[0.16em] text-coral">
            RELATED
          </p>
          <p className="mt-1 text-[10px] text-zinc-600">关联知识</p>
        </div>
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
          {related.map(({ relationType, reason, node: item }) => (
            <button
              type="button"
              onClick={() => chooseNode(item.id)}
              key={item.id}
              className="group min-w-44 flex-1 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-left transition-colors hover:border-coral/30 hover:bg-coral/[0.04]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs text-zinc-300 group-hover:text-white">
                  {item.nameZh}
                </span>
                <ChevronRight className="size-3 shrink-0 text-zinc-700" />
              </div>
              <p className="mt-1 text-[10px] text-zinc-600">
                {item.nameEn} · {item.typeZh}
              </p>
              <p className="mt-1.5 flex items-start gap-1.5 border-t border-white/5 pt-1.5">
                <span className="shrink-0 rounded bg-coral/10 px-1 py-0.5 text-[9px] text-coral">
                  {relationTypeLabels[relationType]}
                </span>
                <span className="text-[10px] leading-4 text-zinc-500">
                  {reason}
                </span>
              </p>
            </button>
          ))}
          {!related.length && (
            <p className="text-xs text-zinc-700">
              关联节点将在知识整理后出现。
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function ModelLoading({ progress }: { progress: number }) {
  return (
    <div className="grid size-full place-items-center">
      <div className="w-56 text-center">
        <LoaderCircle className="mx-auto size-7 animate-spin text-coral" />
        <p className="mt-3 text-sm">正在装配可视化模型</p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-coral transition-all"
            style={{ width: `${Math.max(6, progress)}%` }}
          />
        </div>
        <p className="mt-2 font-mono text-[10px] text-zinc-600">
          {progress ? `${progress}%` : '读取本地模型…'}
        </p>
      </div>
    </div>
  );
}
function LoadFailure({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="grid size-full place-items-center p-8">
      <div className="max-w-sm text-center">
        <CircleAlert className="mx-auto mb-3 text-red-300" />
        <p>模型加载失败</p>
        <p className="mt-2 text-xs text-zinc-600">{message}</p>
        <Button className="mt-4" onClick={retry}>
          重新加载
        </Button>
      </div>
    </div>
  );
}
