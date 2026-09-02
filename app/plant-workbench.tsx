'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Focus,
  Leaf as LeafIcon,
  RotateCcw,
  Search,
  Sprout,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlantViewer } from '@/components/plant/plant-viewer';
import {
  plantExplorerTree,
  plantLevelLabels,
  plantLevelScale,
  plantScaleLabels,
  structuresInPlantLevel,
  type PlantExplorerItem,
  type PlantModelLevel,
} from '@/data/plant/plant-explorer';
import {
  knowledgeNodes,
  relationTypeLabels,
  type KnowledgeNode,
} from '@/lib/knowledge-nodes';

const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(' ');

const levelForNode: Partial<Record<string, PlantModelLevel>> = {
  spinach: 'spinach',
  leaf: 'leaf',
  'mesophyll-cell': 'mesophyll-cell',
  chloroplast: 'chloroplast',
};

function nextExploreLevel(
  currentNodeId: string,
  currentLevel: PlantModelLevel,
): PlantModelLevel | null {
  if (currentNodeId === 'spinach' && currentLevel === 'spinach') return 'leaf';
  if (currentNodeId === 'leaf' && currentLevel === 'spinach') return 'leaf';
  if (
    (currentNodeId === 'leaf' && currentLevel === 'leaf') ||
    (currentNodeId === 'mesophyll-cell' && currentLevel !== 'mesophyll-cell')
  )
    return 'mesophyll-cell';
  if (currentNodeId === 'chloroplast' && currentLevel !== 'chloroplast')
    return 'chloroplast';
  return null;
}

export function PlantWorkbench({
  atlasSwitcher,
}: {
  atlasSwitcher: ReactNode;
}) {
  const [modelLevel, setModelLevel] = useState<PlantModelLevel>('spinach');
  const [selectedId, setSelectedId] = useState<string | null>('spinach');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState('spinach');
  const [modelContextId, setModelContextId] = useState('spinach');
  const [history, setHistory] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [focusRequestKey, setFocusRequestKey] = useState(0);
  const [cameraOwnership, setCameraOwnership] = useState<'auto' | 'manual'>(
    'manual',
  );

  const currentNode = knowledgeNodes[currentNodeId] ?? knowledgeNodes.spinach;
  const modelContextNode =
    knowledgeNodes[modelContextId] ?? knowledgeNodes.spinach;
  const hoveredNode = hoveredId ? knowledgeNodes[hoveredId] : undefined;
  const deeperLevel = nextExploreLevel(currentNodeId, modelLevel);
  const filteredIds = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return null;
    return [
      'spinach',
      'leaf',
      'mesophyll-cell',
      'chloroplast',
      'mitochondrion',
    ].filter((id) => {
      const node = knowledgeNodes[id];
      return (
        node?.nameZh.includes(normalized) ||
        node?.nameEn?.toLowerCase().includes(normalized) ||
        id.includes(normalized)
      );
    });
  }, [query]);

  const selectKnowledge = (id: string, addHistory = true) => {
    if (!knowledgeNodes[id]) return;
    if (addHistory && id !== currentNodeId)
      setHistory((items) => [...items, currentNodeId]);
    setCurrentNodeId(id);
    if (structuresInPlantLevel[modelLevel].includes(id)) setSelectedId(id);
  };

  const enterLevel = (level: PlantModelLevel) => {
    if (currentNodeId !== level)
      setHistory((items) => [...items, currentNodeId]);
    setModelLevel(level);
    setModelContextId(level);
    setCurrentNodeId(level);
    setSelectedId(level);
    setHoveredId(null);
    setCameraOwnership('auto');
    setFocusRequestKey((key) => key + 1);
    window.setTimeout(() => setCameraOwnership('manual'), 460);
  };

  const focusSelected = () => {
    if (!selectedId) return;
    setCameraOwnership('auto');
    setFocusRequestKey((key) => key + 1);
    window.setTimeout(() => setCameraOwnership('manual'), 460);
  };

  const resetPlant = () => {
    setModelLevel('spinach');
    setSelectedId('spinach');
    setHoveredId(null);
    setCurrentNodeId('spinach');
    setModelContextId('spinach');
    setHistory([]);
    setQuery('');
    setCameraOwnership('auto');
    setFocusRequestKey((key) => key + 1);
    window.setTimeout(() => setCameraOwnership('manual'), 460);
  };

  const goBack = () => {
    setHistory((items) => {
      if (!items.length) return items;
      setCurrentNodeId(items[items.length - 1]);
      return items.slice(0, -1);
    });
  };

  return (
    <main className="flex min-h-screen flex-col overflow-hidden bg-[#0a0a09] text-zinc-100">
      <PlantTopNavigation
        atlasSwitcher={atlasSwitcher}
        level={modelLevel}
        currentNode={currentNode}
        query={query}
        setQuery={setQuery}
        reset={resetPlant}
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_auto_auto_auto] lg:grid-cols-[270px_minmax(460px,1fr)_350px] lg:grid-rows-[minmax(0,1fr)_110px]">
        <PlantExplorer
          query={query}
          filteredIds={filteredIds}
          selectedId={currentNodeId}
          modelLevel={modelLevel}
          selectNode={selectKnowledge}
          enterLevel={enterLevel}
        />
        <section className="relative order-1 min-h-[650px] overflow-hidden bg-[radial-gradient(circle_at_50%_48%,#233021_0%,#111610_50%,#090b09_82%)] lg:order-2 lg:min-h-0">
          <div className="absolute left-4 right-4 top-3 z-20 flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-400/75">
                02 / Visual Workspace
              </p>
              <p className="mt-1 text-[10px] text-zinc-600">
                {plantLevelLabels[modelLevel].zh} ·{' '}
                {plantLevelLabels[modelLevel].en}
              </p>
              <p className="mt-1 font-mono text-[9px] tracking-[0.14em] text-emerald-300/60">
                {cameraOwnership === 'auto' ? 'AUTO FIT' : 'USER CONTROL'}
              </p>
            </div>
            <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-1.5 text-[10px] text-emerald-200/70">
              教学示意模型
            </span>
          </div>
          <div className="absolute inset-0 pt-16">
            <PlantViewer
              level={modelLevel}
              selectedId={selectedId}
              focusRequestKey={focusRequestKey}
              onHover={setHoveredId}
              onSelect={(id) => {
                if (!id) {
                  setSelectedId(null);
                  return;
                }
                selectKnowledge(id);
              }}
              onInteractionStart={() => setCameraOwnership('manual')}
            />
          </div>
          {hoveredNode && (
            <div className="pointer-events-none absolute left-5 top-24 z-20 rounded-lg border border-white/10 bg-black/75 px-3 py-2 backdrop-blur">
              <p className="text-xs text-white">{hoveredNode.nameZh}</p>
              <p className="mt-0.5 text-[10px] text-zinc-500">
                {hoveredNode.nameEn}
              </p>
            </div>
          )}
          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-white/10 bg-black/65 p-1.5 backdrop-blur">
            <Button
              variant="ghost"
              size="sm"
              onClick={focusSelected}
              disabled={!selectedId}
            >
              <Focus />
              聚焦
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={resetPlant}
              title="重置植物图谱"
            >
              <RotateCcw />
            </Button>
          </div>
        </section>
        <PlantKnowledgePanel
          node={currentNode}
          modelContextNode={modelContextNode}
          history={history}
          deeperLevel={deeperLevel}
          goBack={goBack}
          explore={() => deeperLevel && enterLevel(deeperLevel)}
        />
        <PlantRelatedKnowledge
          node={currentNode}
          chooseNode={selectKnowledge}
        />
      </div>
    </main>
  );
}

function PlantTopNavigation({
  atlasSwitcher,
  level,
  currentNode,
  query,
  setQuery,
  reset,
}: {
  atlasSwitcher: ReactNode;
  level: PlantModelLevel;
  currentNode: KnowledgeNode;
  query: string;
  setQuery: (value: string) => void;
  reset: () => void;
}) {
  return (
    <header className="grid min-h-16 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-white/10 px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <div className="grid size-8 place-items-center rounded-full border border-emerald-400/40 bg-emerald-400/10">
          <Sprout className="size-4 text-emerald-300" />
        </div>
        <div>
          <p className="text-sm font-semibold">BioScope</p>
          <p className="hidden font-mono text-[8px] tracking-[0.18em] text-zinc-600 sm:block">
            PLANT ATLAS · 菠菜
          </p>
        </div>
      </div>
      <div className="hidden min-w-0 items-center justify-center gap-4 lg:flex">
        <div className="relative w-full max-w-60">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-600" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索植物结构或知识"
            className="h-8 border-white/10 bg-white/[0.025] pl-8 text-xs"
          />
        </div>
        <nav
          aria-label="当前位置"
          className="flex shrink-0 items-center gap-1 text-[11px] text-zinc-600"
        >
          <button type="button" onClick={reset} className="hover:text-zinc-200">
            菠菜
          </button>
          {level !== 'spinach' && (
            <>
              <ChevronRight className="size-3" />
              <span>{plantLevelLabels[level].zh}</span>
            </>
          )}
          {currentNode.id !== level && currentNode.id !== 'spinach' && (
            <>
              <ChevronRight className="size-3" />
              <span className="text-zinc-300">{currentNode.nameZh}</span>
            </>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {atlasSwitcher}
        <PlantScaleNavigator current={plantLevelScale[level]} />
      </div>
    </header>
  );
}

function PlantScaleNavigator({ current }: { current: KnowledgeNode['scale'] }) {
  return (
    <div className="hidden items-center 2xl:flex">
      {plantScaleLabels.map((scale, index) => (
        <div className="flex items-center" key={scale.id}>
          {index > 0 && <span className="mx-1.5 h-px w-3 bg-white/10" />}
          <button
            type="button"
            disabled={!scale.enabled}
            title={scale.enabled ? scale.zh : `${scale.zh} · 后续阶段开放`}
            className={cn(
              'relative py-3 font-mono text-[9px] tracking-[0.12em]',
              current === scale.id
                ? 'text-emerald-300'
                : scale.enabled
                  ? 'text-zinc-500'
                  : 'cursor-not-allowed text-zinc-800',
            )}
          >
            {scale.en}
            {current === scale.id && (
              <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-emerald-300" />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}

function PlantExplorer({
  query,
  filteredIds,
  selectedId,
  modelLevel,
  selectNode,
  enterLevel,
}: {
  query: string;
  filteredIds: string[] | null;
  selectedId: string;
  modelLevel: PlantModelLevel;
  selectNode: (id: string) => void;
  enterLevel: (level: PlantModelLevel) => void;
}) {
  return (
    <aside className="order-2 flex min-h-[520px] flex-col border-white/10 lg:order-1 lg:min-h-0 lg:border-r">
      <div className="border-b border-white/10 p-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-400/75">
          01 / Explorer
        </p>
        <p className="mt-3 font-mono text-[8px] tracking-[0.16em] text-zinc-700">
          植物结构 · 中文优先
        </p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="py-3">
          {filteredIds
            ? filteredIds.map((id) => (
                <PlantTreeRow
                  key={id}
                  item={{ id }}
                  depth={0}
                  selectedId={selectedId}
                  modelLevel={modelLevel}
                  selectNode={selectNode}
                  enterLevel={enterLevel}
                />
              ))
            : plantExplorerTree.map((item) => (
                <PlantTreeRow
                  key={item.id}
                  item={item}
                  depth={0}
                  selectedId={selectedId}
                  modelLevel={modelLevel}
                  selectNode={selectNode}
                  enterLevel={enterLevel}
                />
              ))}
          {query && filteredIds?.length === 0 && (
            <p className="px-4 py-8 text-center text-xs text-zinc-700">
              没有找到匹配的植物结构
            </p>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

function PlantTreeRow({
  item,
  depth,
  selectedId,
  modelLevel,
  selectNode,
  enterLevel,
}: {
  item: PlantExplorerItem;
  depth: number;
  selectedId: string;
  modelLevel: PlantModelLevel;
  selectNode: (id: string) => void;
  enterLevel: (level: PlantModelLevel) => void;
}) {
  const node = knowledgeNodes[item.id];
  if (!node) return null;
  const targetLevel = levelForNode[item.id];
  return (
    <div>
      <div
        className={cn(
          'group flex items-center border-l border-transparent pr-2',
          selectedId === item.id && 'border-emerald-300 bg-emerald-300/[0.045]',
        )}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <button
          type="button"
          onClick={() => selectNode(item.id)}
          className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left"
        >
          {depth === 0 ? (
            <Sprout className="size-3.5 shrink-0 text-emerald-400/65" />
          ) : (
            <LeafIcon className="size-3 shrink-0 text-zinc-700" />
          )}
          <span className="min-w-0">
            <span className="block truncate text-xs text-zinc-300 group-hover:text-white">
              {node.nameZh}
            </span>
            <span className="block truncate text-[9px] text-zinc-700">
              {node.nameEn}
            </span>
          </span>
        </button>
        {targetLevel && (
          <button
            type="button"
            onClick={() => enterLevel(targetLevel)}
            title={`打开${node.nameZh}模型`}
            aria-label={`打开${node.nameZh}模型`}
            className={cn(
              'grid size-7 place-items-center rounded-md text-zinc-700 hover:bg-white/5 hover:text-emerald-300',
              modelLevel === targetLevel && 'text-emerald-400/70',
            )}
          >
            <ChevronRight className="size-3" />
          </button>
        )}
      </div>
      {item.children?.map((child) => (
        <PlantTreeRow
          key={child.id}
          item={child}
          depth={depth + 1}
          selectedId={selectedId}
          modelLevel={modelLevel}
          selectNode={selectNode}
          enterLevel={enterLevel}
        />
      ))}
    </div>
  );
}

function PlantKnowledgePanel({
  node,
  modelContextNode,
  history,
  deeperLevel,
  goBack,
  explore,
}: {
  node: KnowledgeNode;
  modelContextNode: KnowledgeNode;
  history: string[];
  deeperLevel: PlantModelLevel | null;
  goBack: () => void;
  explore: () => void;
}) {
  return (
    <aside className="order-3 flex min-h-[600px] flex-col border-t border-white/10 lg:min-h-0 lg:border-l lg:border-t-0">
      <div className="border-b border-white/10 p-5">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-400/75">
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
        </p>
        {node.id !== modelContextNode.id && (
          <div className="mt-3 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.035] px-3 py-2">
            <p className="text-[9px] tracking-[0.12em] text-emerald-300/70">
              当前模型语境
            </p>
            <p className="mt-1 text-xs text-zinc-200">
              {modelContextNode.nameZh}
            </p>
          </div>
        )}
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="mt-3 text-[10px]"
          >
            <ArrowLeft className="size-3" />
            返回上一知识
          </Button>
        )}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-5">
          <PlantKnowledgeSection index="01" title="WHAT IS IT?" zh="它是什么？">
            <p>{node.summary}</p>
          </PlantKnowledgeSection>
          <PlantKnowledgeSection
            index="02"
            title="WHERE IS IT?"
            zh="它在哪里？"
          >
            <p>
              {node.location ??
                '这是一个跨生命对象知识节点，当前模型语境会继续保留。'}
            </p>
          </PlantKnowledgeSection>
          <PlantKnowledgeSection
            index="03"
            title="WHAT DOES IT DO?"
            zh="它做什么？"
          >
            <ul>
              {(node.coreFunctions ?? ['知识内容将在后续阶段继续扩展'])
                .slice(0, 3)
                .map((item) => (
                  <li key={item}>{item}</li>
                ))}
            </ul>
          </PlantKnowledgeSection>
          <PlantKnowledgeSection
            index="04"
            title="HOW DOES IT WORK?"
            zh="它怎么工作？"
          >
            <p>
              {node.mechanism ??
                '本阶段先建立结构与知识关系，具体机制将在后续演示中展开。'}
            </p>
          </PlantKnowledgeSection>
          <PlantKnowledgeSection
            index="05"
            title="KEY STRUCTURES"
            zh="关键结构"
          >
            <div className="grid gap-1.5">
              {(node.keyStructures ?? []).slice(0, 5).map((item) => (
                <div
                  key={`${item.nameZh}-${item.nameEn ?? ''}`}
                  className="flex items-center justify-between rounded-md bg-white/[0.025] px-2.5 py-2"
                >
                  <span>{item.nameZh}</span>
                  <span className="text-[10px] text-zinc-700">
                    {item.nameEn}
                  </span>
                </div>
              ))}
              {!node.keyStructures?.length && (
                <p className="text-zinc-700">当前节点没有独立结构模型。</p>
              )}
            </div>
          </PlantKnowledgeSection>
          <PlantKnowledgeSection
            index="06"
            title="WHY SHOULD I CARE?"
            zh="为什么值得理解？"
          >
            <p>
              {node.whyItMatters ?? '它帮助把结构、过程和跨尺度知识连接起来。'}
            </p>
          </PlantKnowledgeSection>
          {deeperLevel && (
            <Button
              onClick={explore}
              className="mt-2 w-full bg-emerald-300 text-[#071009] hover:bg-emerald-200"
            >
              Explore deeper · 深入{plantLevelLabels[deeperLevel].zh}
              <ChevronRight />
            </Button>
          )}
          <div className="mt-5 border-t border-white/10 pt-4 text-[10px] leading-5 text-zinc-700">
            <p>本模块使用程序化教学示意模型，不代表真实组织数量与严格比例。</p>
            <p>仅供生命科学学习，不用于诊断、农业生产或实验决策。</p>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}

function PlantKnowledgeSection({
  index,
  title,
  zh,
  children,
}: {
  index: string;
  title: string;
  zh: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-5 text-xs leading-5 text-zinc-400">
      <div className="mb-2 flex items-center gap-2 font-mono text-[9px] tracking-[0.12em]">
        <span className="text-emerald-300/70">{index}</span>
        <span className="text-zinc-600">{title}</span>
        <span className="text-zinc-700">{zh}</span>
      </div>
      {children}
    </section>
  );
}

function PlantRelatedKnowledge({
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
    <section className="order-4 border-t border-white/10 bg-[#0d100d] px-4 py-3 lg:col-span-3 lg:row-start-2 lg:px-6">
      <div className="flex h-full items-center gap-4">
        <div className="w-28 shrink-0">
          <p className="font-mono text-[9px] tracking-[0.16em] text-emerald-300/70">
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
              className="group min-w-44 flex-1 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-left transition-colors hover:border-emerald-300/25 hover:bg-emerald-300/[0.035]"
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
                <span className="shrink-0 rounded bg-emerald-300/10 px-1 py-0.5 text-[9px] text-emerald-300/70">
                  {relationTypeLabels[relationType]}
                </span>
                <span className="text-[10px] leading-4 text-zinc-500">
                  {reason}
                </span>
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
