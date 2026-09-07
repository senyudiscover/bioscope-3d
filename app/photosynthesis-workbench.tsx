'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Focus,
  Microscope,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PhotosynthesisViewer } from '@/components/photosynthesis/photosynthesis-viewer';
import { MicroLabWorkspace } from '@/components/micro-lab/micro-lab-workspace';
import {
  lightReactionSteps,
  microStructureTerms,
  photosynthesisScenes,
  sceneOrder,
  type PhotosynthesisSceneId,
} from '@/data/photosynthesis/micro-lab';
import {
  getParentScene,
  getPrimaryChildScene,
  getAdjacentMechanismSteps,
  type KnowledgeContext,
  type VisualContext,
} from '@/lib/bioscope-core';
import {
  knowledgeNodes,
  relationTypeLabels,
  type KnowledgeNode,
} from '@/lib/knowledge-nodes';

const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(' ');

export function PhotosynthesisWorkbench({
  atlasSwitcher,
}: {
  atlasSwitcher: ReactNode;
}) {
  // Visual Context and Knowledge Context intentionally remain independent.
  const [visualContext, setVisualContext] = useState<
    VisualContext<PhotosynthesisSceneId>
  >({ sceneId: 'mesophyll-cell' });
  const [selectedId, setSelectedId] = useState<string | null>('mesophyll-cell');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [knowledgeContext, setKnowledgeContext] = useState<KnowledgeContext>({
    nodeId: 'mesophyll-cell',
  });
  const [modelContextId, setModelContextId] = useState('mesophyll-cell');
  const [knowledgeHistory, setKnowledgeHistory] = useState<string[]>([]);
  const [focusRequestKey, setFocusRequestKey] = useState(0);
  const [cameraOwnership, setCameraOwnership] = useState<'auto' | 'manual'>(
    'manual',
  );
  const [activeStepId, setActiveStepId] = useState<string | null>(null);

  const scene = visualContext.sceneId;
  const currentNode =
    knowledgeNodes[knowledgeContext.nodeId] ?? knowledgeNodes['mesophyll-cell'];
  const modelContextNode =
    knowledgeNodes[modelContextId] ?? knowledgeNodes['mesophyll-cell'];
  const hoveredTerm = hoveredId ? microStructureTerms[hoveredId] : undefined;
  const canExplore =
    (scene === 'mesophyll-cell' && selectedId === 'chloroplast') ||
    (scene === 'chloroplast' &&
      (selectedId === 'granum' || selectedId === 'thylakoid'));
  const nextScene = canExplore
    ? getPrimaryChildScene(photosynthesisScenes[scene], photosynthesisScenes)
        ?.id
    : undefined;
  const parentScene = getParentScene(
    photosynthesisScenes[scene],
    photosynthesisScenes,
  );
  const activeStep = lightReactionSteps.find((step) => step.id === activeStepId);
  const adjacentSteps = activeStep
    ? getAdjacentMechanismSteps(lightReactionSteps, activeStep.id)
    : {};

  const chooseKnowledgeNode = (id: string) => {
    if (!knowledgeNodes[id]) return;
    if (id !== knowledgeContext.nodeId)
      setKnowledgeHistory((items) => [...items, knowledgeContext.nodeId]);
    setKnowledgeContext({ nodeId: id });
  };

  const goToStep = (id: string) => {
    const step = lightReactionSteps.find((item) => item.id === id);
    if (!step) return;
    setActiveStepId(step.id);
    chooseKnowledgeNode(step.knowledgeNodeIds[0]);
  };

  const selectStructure = (id: string | null) => {
    setSelectedId(id);
    if (!id) return;
    const knowledgeId = microStructureTerms[id]?.knowledgeNodeId;
    if (knowledgeId) chooseKnowledgeNode(knowledgeId);
  };

  const enterScene = (next: PhotosynthesisSceneId) => {
    const nodeId = photosynthesisScenes[next].knowledgeNodeId;
    setVisualContext({ sceneId: next });
    setSelectedId(nodeId);
    setHoveredId(null);
    setKnowledgeContext({ nodeId });
    setModelContextId(nodeId);
    setCameraOwnership('auto');
    if (next === 'thylakoid') goToStep(lightReactionSteps[0].id);
    setFocusRequestKey((key) => key + 1);
    window.setTimeout(() => setCameraOwnership('manual'), 470);
  };

  const focusSelected = () => {
    if (!selectedId) return;
    setCameraOwnership('auto');
    setFocusRequestKey((key) => key + 1);
    window.setTimeout(() => setCameraOwnership('manual'), 470);
  };

  const resetLab = () => {
    setVisualContext({ sceneId: 'mesophyll-cell' });
    setSelectedId('mesophyll-cell');
    setHoveredId(null);
    setKnowledgeContext({ nodeId: 'mesophyll-cell' });
    setModelContextId('mesophyll-cell');
    setKnowledgeHistory([]);
    setActiveStepId(null);
    setCameraOwnership('auto');
    setFocusRequestKey((key) => key + 1);
    window.setTimeout(() => setCameraOwnership('manual'), 470);
  };

  const goBackKnowledge = () => {
    setKnowledgeHistory((items) => {
      if (!items.length) return items;
      setKnowledgeContext({ nodeId: items[items.length - 1] });
      return items.slice(0, -1);
    });
  };

  return (
    <MicroLabWorkspace
      header={<MicroLabHeader
        atlasSwitcher={atlasSwitcher}
        scene={scene}
        enterScene={enterScene}
        reset={resetLab}
      />}
      explorer={<MicroExplorer
          scene={scene}
          selectedId={selectedId}
          activeStep={activeStep}
          activeStepId={activeStepId}
          goToStep={goToStep}
          adjacentSteps={adjacentSteps}
          chooseNode={chooseKnowledgeNode}
          enterScene={enterScene}
      />}
      visual={<section className="relative order-1 min-h-[650px] overflow-hidden bg-[radial-gradient(circle_at_50%_46%,#1b211c_0%,#101311_52%,#090b0a_82%)] lg:order-2 lg:min-h-0">
          <div className="absolute left-4 right-4 top-3 z-20 flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#9caf8a]">
                02 / Visual Workspace
              </p>
              <p className="mt-1 text-[11px] text-zinc-400">
                {photosynthesisScenes[scene].titleZh}
                <span className="ml-2 text-[10px] text-zinc-600">
                  {photosynthesisScenes[scene].titleEn}
                </span>
              </p>
              <p className="mt-1 font-mono text-[9px] tracking-[0.14em] text-zinc-600">
                {cameraOwnership === 'auto' ? 'AUTO FIT' : 'USER CONTROL'}
              </p>
            </div>
            <span className="rounded-full border border-[#91a37e]/20 bg-[#91a37e]/[0.055] px-3 py-1.5 text-[10px] text-[#b0bea4]">
              教学示意模型
            </span>
          </div>
          <div
            key={scene}
            className="absolute inset-0 pt-16 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
          >
            <PhotosynthesisViewer
              scene={scene}
              selectedId={selectedId}
              hoveredId={hoveredId}
              emphasizedIds={scene === 'thylakoid' ? activeStep?.meshIds : undefined}
              focusRequestKey={focusRequestKey}
              onHover={setHoveredId}
              onSelect={selectStructure}
              onInteractionStart={() => setCameraOwnership('manual')}
            />
          </div>
          {hoveredTerm && (
            <div className="pointer-events-none absolute left-5 top-24 z-30 rounded-lg border border-white/10 bg-[#090b0a]/90 px-3 py-2 shadow-2xl backdrop-blur">
              <p className="text-xs text-zinc-100">{hoveredTerm.nameZh}</p>
              <p className="mt-0.5 text-[10px] text-zinc-600">
                {hoveredTerm.nameEn}
              </p>
            </div>
          )}
          <SceneGuide scene={scene} />
          <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-white/10 bg-[#090b0a]/80 p-1.5 shadow-xl backdrop-blur">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => parentScene && enterScene(parentScene.id)}
              disabled={!parentScene}
              title="返回上一级观察尺度"
            >
              <ArrowLeft />
              上一级
            </Button>
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
              onClick={resetLab}
              title="重置微观实验室"
            >
              <RotateCcw />
            </Button>
          </div>
      </section>}
      knowledge={<MicroKnowledgePanel
          node={currentNode}
          modelContextNode={modelContextNode}
          history={knowledgeHistory}
          nextScene={nextScene}
          goBack={goBackKnowledge}
          explore={() => nextScene && enterScene(nextScene)}
      />}
      related={<MicroRelatedKnowledge
          node={currentNode}
          chooseNode={chooseKnowledgeNode}
      />}
    />
  );
}

function MicroLabHeader({
  atlasSwitcher,
  scene,
  enterScene,
  reset,
}: {
  atlasSwitcher: ReactNode;
  scene: PhotosynthesisSceneId;
  enterScene: (scene: PhotosynthesisSceneId) => void;
  reset: () => void;
}) {
  const activeIndex = sceneOrder.indexOf(scene);
  return (
    <header className="grid min-h-16 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-white/10 px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <div className="grid size-8 place-items-center rounded-full border border-[#9caf8a]/35 bg-[#9caf8a]/10">
          <Microscope className="size-4 text-[#b4c5a6]" />
        </div>
        <div>
          <p className="text-sm font-semibold">BioScope</p>
          <p className="hidden font-mono text-[8px] tracking-[0.17em] text-zinc-600 sm:block">
            PHOTOSYNTHESIS MICRO LAB
          </p>
        </div>
      </div>
      <nav
        aria-label="光合作用微观尺度"
        className="hidden min-w-0 items-center justify-center gap-1 lg:flex"
      >
        {sceneOrder.map((item, index) => {
          const meta = photosynthesisScenes[item];
          const reachable = index <= activeIndex;
          return (
            <div key={item} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="size-3 text-zinc-700" />}
              <button
                type="button"
                disabled={!reachable}
                onClick={() => enterScene(item)}
                className={cn(
                  'rounded-md px-2 py-1 text-[11px] transition-colors',
                  item === scene
                    ? 'bg-white/[0.055] text-[#bdcbb2]'
                    : reachable
                      ? 'text-zinc-500 hover:text-zinc-200'
                      : 'cursor-not-allowed text-zinc-800',
                )}
              >
                {meta.titleZh}
              </button>
            </div>
          );
        })}
      </nav>
      <div className="flex items-center gap-3">
        {atlasSwitcher}
        <Button variant="ghost" size="icon-sm" onClick={reset} title="重置">
          <RotateCcw />
        </Button>
      </div>
    </header>
  );
}

function MicroExplorer({
  scene,
  selectedId,
  enterScene,
  chooseNode,
  activeStep,
  activeStepId,
  goToStep,
  adjacentSteps,
}: {
  scene: PhotosynthesisSceneId;
  selectedId: string | null;
  enterScene: (scene: PhotosynthesisSceneId) => void;
  chooseNode: (id: string) => void;
  activeStep?: (typeof lightReactionSteps)[number];
  activeStepId: string | null;
  goToStep: (id: string) => void;
  adjacentSteps: { prev?: (typeof lightReactionSteps)[number]; next?: (typeof lightReactionSteps)[number] };
}) {
  const activeIndex = sceneOrder.indexOf(scene);
  return (
    <aside className="order-2 flex min-h-[500px] flex-col border-white/10 lg:order-1 lg:min-h-0 lg:border-r">
      <div className="border-b border-white/10 p-4">
        <p className="font-mono text-[9px] tracking-[0.18em] text-[#9caf8a]">
          01 / MICRO EXPLORER
        </p>
        <p className="mt-2 text-[10px] leading-4 text-zinc-600">
          从细胞进入光反应发生的膜结构
        </p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3">
          {sceneOrder.map((item, index) => {
            const meta = photosynthesisScenes[item];
            const reachable = index <= activeIndex;
            return (
              <div key={item} className="relative">
                {index > 0 && (
                  <span className="absolute -top-3 left-[17px] h-3 w-px bg-white/10" />
                )}
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => enterScene(item)}
                  className={cn(
                    'mb-3 flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors',
                    item === scene
                      ? 'border-[#93a784]/35 bg-[#93a784]/[0.07]'
                      : reachable
                        ? 'border-white/8 bg-white/[0.015] hover:border-white/15'
                        : 'cursor-not-allowed border-white/5 opacity-35',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-7 shrink-0 place-items-center rounded-full border font-mono text-[9px]',
                      item === scene
                        ? 'border-[#a6b997]/45 text-[#bdcbb2]'
                        : 'border-white/10 text-zinc-700',
                    )}
                  >
                    0{index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-zinc-300">
                      {meta.titleZh}
                    </span>
                    <span className="mt-0.5 block truncate text-[9px] text-zinc-600">
                      {meta.titleEn}
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
          <div className="mt-5 border-t border-white/8 pt-4">
            <p className="font-mono text-[8px] tracking-[0.14em] text-zinc-700">
              KNOWLEDGE LINKS
            </p>
            <div className="mt-2 grid gap-1.5">
              {['photosynthesis', 'light-reactions', 'mitochondrion'].map(
                (id) => (
                  <button
                    type="button"
                    key={id}
                    onClick={() => chooseNode(id)}
                    className="flex items-center justify-between rounded-md px-2 py-2 text-left text-[11px] text-zinc-500 hover:bg-white/[0.025] hover:text-zinc-200"
                  >
                    <span>{knowledgeNodes[id]?.nameZh}</span>
                    <ChevronRight className="size-3 text-zinc-700" />
                  </button>
                ),
              )}
            </div>
          </div>
          {scene === 'thylakoid' && (
          <div className="mt-5 rounded-lg border border-[#9caf8a]/20 bg-white/[0.015] p-3">
            <p className="font-mono text-[8px] tracking-[0.14em] text-zinc-700">
              LIGHT REACTION · {activeStep ? `${lightReactionSteps.findIndex((step) => step.id === activeStep.id) + 1} / ${lightReactionSteps.length}` : ''}
            </p>
            <div className="mt-2 grid gap-1.5">
              {lightReactionSteps.map((step) => (
                <button
                  type="button"
                  key={step.id}
                  onClick={() => goToStep(step.id)}
                  aria-current={activeStepId === step.id ? 'step' : undefined}
                  className={cn('rounded-md border px-2 py-1.5 text-left', activeStepId === step.id ? 'border-[#aabd9b]/45 bg-[#9caf8a]/10 text-zinc-100' : 'border-white/8 text-zinc-500 hover:text-zinc-200')}>
                  <span className="block text-[10px]">{step.titleZh}</span>
                  <span className="mt-0.5 block text-[9px] leading-3 text-zinc-600">{step.description}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-4 text-zinc-500">{activeStep?.description}</p>
            <div className="mt-2 flex gap-1.5">
              <Button size="sm" variant="ghost" disabled={!adjacentSteps.prev} onClick={() => adjacentSteps.prev && goToStep(adjacentSteps.prev.id)}>上一步</Button>
              <Button size="sm" variant="ghost" disabled={!adjacentSteps.next} onClick={() => adjacentSteps.next && goToStep(adjacentSteps.next.id)}>下一步</Button>
            </div>
          </div>
          )}
          {selectedId === 'mitochondrion' && (
            <p className="mt-4 rounded-lg border border-[#a87358]/15 bg-[#a87358]/[0.035] p-3 text-[10px] leading-4 text-zinc-500">
              植物细胞同时通过线粒体进行细胞呼吸。
            </p>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

function SceneGuide({ scene }: { scene: PhotosynthesisSceneId }) {
  if (scene === 'mesophyll-cell')
    return (
      <div className="pointer-events-none absolute bottom-20 right-4 z-20 hidden w-36 space-y-1.5 xl:block">
        {[
          ['细胞壁', '外层支撑'],
          ['细胞膜', '细胞壁内侧'],
          ['细胞质', '外围薄层'],
          ['中央液泡', '占据中央'],
          ['叶绿体', '主要视觉'],
          ['线粒体', '细胞呼吸'],
        ].map(([name, note]) => (
          <div
            key={name}
            className="flex items-center justify-between border-b border-white/7 py-1 text-[9px]"
          >
            <span className="text-zinc-400">{name}</span>
            <span className="text-zinc-700">{note}</span>
          </div>
        ))}
      </div>
    );
  if (scene === 'chloroplast')
    return (
      <div className="pointer-events-none absolute bottom-20 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {['双层膜', '基质', '基粒', '类囊体'].map((item) => (
          <span
            key={item}
            className="rounded-full border border-white/10 bg-[#090b0a]/70 px-3 py-1 text-[9px] text-zinc-500 backdrop-blur"
          >
            {item}
          </span>
        ))}
      </div>
    );
  return (
    <>
      <div className="pointer-events-none absolute right-4 top-24 z-20 w-36 rounded-lg border border-white/9 bg-[#090b0a]/75 p-3 backdrop-blur">
        <div className="border-b border-white/8 pb-2">
          <p className="text-[10px] text-[#a9b69f]">基质</p>
          <p className="text-[8px] text-zinc-700">Stroma</p>
        </div>
        <div className="border-b border-white/8 py-2">
          <p className="text-[10px] text-[#879b79]">类囊体膜</p>
          <p className="text-[8px] text-zinc-700">Thylakoid membrane</p>
        </div>
        <div className="pt-2">
          <p className="text-[10px] text-[#809aa4]">类囊体腔</p>
          <p className="text-[8px] text-zinc-700">Thylakoid lumen</p>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-20 left-1/2 z-20 grid w-[78%] -translate-x-1/2 grid-cols-4 gap-2">
        {[
          ['光系统II', 'Photosystem II'],
          ['电子传递', 'Electron transport'],
          ['光系统I', 'Photosystem I'],
          ['ATP合酶', 'ATP synthase'],
        ].map(([zh, en]) => (
          <div
            key={zh}
            className="rounded-md border border-white/8 bg-[#090b0a]/75 px-2 py-1.5 text-center backdrop-blur"
          >
            <p className="text-[9px] text-zinc-400">{zh}</p>
            <p className="text-[7px] text-zinc-700">{en}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function MicroKnowledgePanel({
  node,
  modelContextNode,
  history,
  nextScene,
  goBack,
  explore,
}: {
  node: KnowledgeNode;
  modelContextNode: KnowledgeNode;
  history: string[];
  nextScene?: PhotosynthesisSceneId;
  goBack: () => void;
  explore: () => void;
}) {
  return (
    <aside className="order-3 flex min-h-[600px] flex-col border-t border-white/10 lg:min-h-0 lg:border-l lg:border-t-0">
      <div className="border-b border-white/10 p-5">
        <p className="font-mono text-[9px] tracking-[0.18em] text-[#9caf8a]">
          03 / KNOWLEDGE
        </p>
        <div
          key={node.id}
          className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
        >
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
            <div className="mt-3 rounded-lg border border-[#9caf8a]/20 bg-[#9caf8a]/[0.035] px-3 py-2">
              <p className="text-[9px] tracking-[0.12em] text-[#9caf8a]">
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
      </div>
      <ScrollArea
        key={node.id}
        className="min-h-0 flex-1 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
      >
        <div className="p-5">
          <KnowledgeSection index="01" zh="它是什么？" en="WHAT IS IT?">
            <p>{node.summary}</p>
          </KnowledgeSection>
          <KnowledgeSection index="02" zh="它在哪里？" en="WHERE IS IT?">
            <p>
              {node.location ??
                '这是一个跨场景知识节点，中央模型语境保持不变。'}
            </p>
          </KnowledgeSection>
          <KnowledgeSection index="03" zh="它做什么？" en="WHAT DOES IT DO?">
            <ul>
              {(node.coreFunctions ?? ['结构知识将在后续阶段继续完善'])
                .slice(0, 3)
                .map((item) => (
                  <li key={item}>{item}</li>
                ))}
            </ul>
          </KnowledgeSection>
          <KnowledgeSection index="04" zh="它怎么工作？" en="HOW DOES IT WORK?">
            <p>
              {node.mechanism ?? '本阶段只建立空间结构，不播放完整机制动画。'}
            </p>
          </KnowledgeSection>
          <KnowledgeSection index="05" zh="关键结构" en="KEY STRUCTURES">
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
          </KnowledgeSection>
          <KnowledgeSection
            index="06"
            zh="为什么值得理解？"
            en="WHY SHOULD I CARE?"
          >
            <p>
              {node.whyItMatters ?? '它帮助把结构、机制和跨尺度知识连接起来。'}
            </p>
          </KnowledgeSection>
          {nextScene && (
            <Button
              onClick={explore}
              className="mt-2 w-full bg-[#aabd9b] text-[#0a1008] hover:bg-[#becdb3]"
            >
              Explore deeper · 深入{photosynthesisScenes[nextScene].titleZh}
              <ChevronRight />
            </Button>
          )}
          {!nextScene && node.id === 'chloroplast' && (
            <p className="mt-3 rounded-lg border border-white/8 bg-white/[0.015] px-3 py-2 text-[10px] text-zinc-600">
              请在模型中点击基粒或类囊体，再进入下一尺度。
            </p>
          )}
          <div className="mt-5 border-t border-white/10 pt-4 text-[10px] leading-5 text-zinc-700">
            <p>教学示意模型：数量、颜色与比例经过简化。</p>
            <p>步骤导航连接当前知识与模型中的对应结构。</p>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}

function KnowledgeSection({
  index,
  zh,
  en,
  children,
}: {
  index: string;
  zh: string;
  en: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-5 text-xs leading-5 text-zinc-400">
      <div className="mb-2 flex items-center gap-2 font-mono text-[9px] tracking-[0.12em]">
        <span className="text-[#9caf8a]">{index}</span>
        <span className="text-zinc-600">{zh}</span>
        <span className="text-zinc-700">{en}</span>
      </div>
      {children}
    </section>
  );
}

function MicroRelatedKnowledge({
  node,
  chooseNode,
}: {
  node: KnowledgeNode;
  chooseNode: (id: string) => void;
}) {
  const related = useMemo(
    () =>
      (node.related ?? [])
        .map((relation) => {
          const target = knowledgeNodes[relation.targetId];
          return target ? { ...relation, node: target } : null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .slice(0, 5),
    [node],
  );
  return (
    <section className="order-4 border-t border-white/10 bg-[#0c0f0d] px-4 py-3 lg:col-span-3 lg:row-start-2 lg:px-6">
      <div className="flex h-full items-center gap-4">
        <div className="w-28 shrink-0">
          <p className="font-mono text-[9px] tracking-[0.16em] text-[#9caf8a]">
            RELATED
          </p>
          <p className="mt-1 text-[10px] text-zinc-600">关联知识</p>
        </div>
        <div
          key={node.id}
          className="flex min-w-0 flex-1 gap-2 overflow-x-auto motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
        >
          {related.map(({ relationType, reason, node: item }) => (
            <button
              type="button"
              onClick={() => chooseNode(item.id)}
              key={item.id}
              className="group min-w-44 flex-1 rounded-lg border border-white/10 bg-white/[0.018] px-3 py-2 text-left transition-colors hover:border-[#9caf8a]/25 hover:bg-[#9caf8a]/[0.035]"
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
                <span className="shrink-0 rounded bg-[#9caf8a]/10 px-1 py-0.5 text-[9px] text-[#a9b99e]">
                  {relationTypeLabels[relationType]}
                </span>
                <span className="text-[10px] leading-4 text-zinc-500">
                  {reason}
                </span>
              </p>
            </button>
          ))}
          {!related.length && (
            <p className="text-xs text-zinc-700">该节点暂未建立关联知识。</p>
          )}
        </div>
      </div>
    </section>
  );
}
