import type { VanatomeIsolationState, VanatomeStructure } from '@vixotic/vanatome-react';
import { displayLayersFor, matchesSystem, type AnatomySystemFilter, type DisplayLayerFilter } from '@/lib/anatomy-filters';

export type PickableStructure = {
  id: string;
  visible: boolean;
  pickable: boolean;
  system: string;
  displayLayer: DisplayLayerFilter[];
  semanticType: 'system' | 'organ' | 'part';
  context: boolean;
};

export type PickResolution = {
  primary: VanatomeStructure | null;
  candidates: VanatomeStructure[];
  ambiguous: boolean;
};

type PickContext = {
  structures: readonly VanatomeStructure[];
  hitId: string | null;
  activeSystem: AnatomySystemFilter;
  displayLayer: DisplayLayerFilter;
  selectedId: string | null;
  hiddenIds: readonly string[];
  isolation: VanatomeIsolationState | null;
};

const getDescendants = (structures: readonly VanatomeStructure[], rootId: string) => {
  const children = new Map<string, string[]>();
  for (const structure of structures) {
    if (!structure.parentId) continue;
    children.set(structure.parentId, [...(children.get(structure.parentId) ?? []), structure.id]);
  }
  const result = new Set<string>();
  const queue = [rootId];
  while (queue.length) {
    const id = queue.pop();
    if (!id || result.has(id)) continue;
    result.add(id);
    queue.push(...(children.get(id) ?? []));
  }
  return result;
};

const getAncestors = (byId: Map<string, VanatomeStructure>, id: string) => {
  const result: VanatomeStructure[] = [];
  let current = byId.get(id);
  while (current?.parentId) {
    current = byId.get(current.parentId);
    if (current) result.push(current);
  }
  return result;
};

const hierarchyDepth = (byId: Map<string, VanatomeStructure>, id: string) => getAncestors(byId, id).length;

export function createPickableStates(context: Omit<PickContext, 'hitId' | 'selectedId'>): Map<string, PickableStructure> {
  const hidden = new Set(context.hiddenIds.flatMap((id) => [...getDescendants(context.structures, id)]));
  const isolated = context.isolation ? getDescendants(context.structures, context.isolation.id) : null;
  const selectedBranch = context.isolation?.mode === 'parent-context' ? getDescendants(context.structures, context.isolation.id) : null;
  return new Map(context.structures.map((structure) => {
    const visible = !hidden.has(structure.id) && (!isolated || isolated.has(structure.id));
    const systemMatch = matchesSystem(structure, context.activeSystem);
    const layerMatch = displayLayersFor(structure).has(context.displayLayer);
    const contextOnly = Boolean(context.isolation?.mode === 'parent-context' && selectedBranch && !selectedBranch.has(structure.id));
    return [structure.id, {
      id: structure.id,
      visible,
      pickable: visible && structure.selectable !== false && (context.activeSystem === 'all' || systemMatch),
      system: structure.system,
      displayLayer: [...displayLayersFor(structure)],
      semanticType: structure.kind ?? 'part',
      context: contextOnly || !layerMatch,
    } satisfies PickableStructure];
  }));
}

export function resolvePickCandidates(context: PickContext): PickResolution {
  if (!context.hitId) return { primary: null, candidates: [], ambiguous: false };
  const byId = new Map(context.structures.map((item) => [item.id, item]));
  const hit = byId.get(context.hitId);
  if (!hit) return { primary: null, candidates: [], ambiguous: false };
  const states = createPickableStates(context);
  const selectedBranch = context.selectedId ? getDescendants(context.structures, context.selectedId) : new Set<string>();
  const seedIds = new Set<string>([hit.id, ...getAncestors(byId, hit.id).map((item) => item.id)]);
  for (const candidate of context.structures) {
    const distance = Math.hypot(candidate.position[0] - hit.position[0], candidate.position[1] - hit.position[1], candidate.position[2] - hit.position[2]);
    if (distance <= 0.16) seedIds.add(candidate.id);
  }
  const ranked = [...seedIds]
    .map((id) => byId.get(id))
    .filter((item): item is VanatomeStructure => Boolean(item && states.get(item.id)?.pickable && (item.kind !== 'system' || item.id === hit.id)))
    .map((structure) => {
      const state = states.get(structure.id)!;
      const distance = Math.hypot(structure.position[0] - hit.position[0], structure.position[1] - hit.position[1], structure.position[2] - hit.position[2]);
      const depth = hierarchyDepth(byId, structure.id);
      const inFocusedBranch = selectedBranch.has(structure.id);
      let score = 0;
      if (matchesSystem(structure, context.activeSystem)) score += 100;
      if (displayLayersFor(structure).has(context.displayLayer)) score += 45;
      if (!state.context) score += 25;
      score += Math.max(0, 22 - distance * 140);
      if (context.selectedId) score += inFocusedBranch ? 28 + Math.min(depth, 5) * 4 : -22;
      else {
        if (structure.kind === 'organ') score += 34;
        if (structure.kind === 'part') score += Math.max(-18, 12 - depth * 7);
      }
      if (/internal.*structures|structures.*internal/i.test(`${structure.id} ${structure.name}`)) score -= 42;
      if (structure.id === hit.id) score += 8;
      return { structure, score };
    })
    .sort((a, b) => b.score - a.score || a.structure.id.localeCompare(b.structure.id));
  const candidates = ranked
    .filter(({ structure }) => !/internal.*structures|structures.*internal/i.test(`${structure.id} ${structure.name}`))
    .slice(0, 5);
  const secondIsChildOfPrimary = candidates[1]?.structure.parentId === candidates[0]?.structure.id;
  const ambiguous = candidates.length > 1 && candidates[0].score - candidates[1].score < 14 && !(context.selectedId === null && candidates[0].structure.kind === 'organ' && secondIsChildOfPrimary);
  return { primary: candidates[0]?.structure ?? null, candidates: candidates.map((item) => item.structure), ambiguous };
}
