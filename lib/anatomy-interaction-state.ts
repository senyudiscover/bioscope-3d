import type { VanatomeIsolationState, VanatomeStructure } from '@vixotic/vanatome-react';

/**
 * 人体解剖工作台的交互状态决策层（纯函数）。
 *
 * 状态归属（2026-09-07 Explore Interaction Pass 审计结论）：
 * - selectedId / isolation / focusRequestKey 由 vanatome controller 持有；
 * - cameraLevel 是 workbench 侧的构图指示器，只能反映"实际发生的相机移动"；
 * - ViewerControls 的聚焦/语境/隔离/隐藏按钮全部以 selectedStructure 为前提。
 *
 * 由此得到两条不变式（回归基线见 tests/anatomy-interaction-state.test.ts）：
 * 1. 隔离依赖选中锚点：selection 清除后 isolation 不允许残留
 *    （否则结构操作按钮全部禁用，用户只能全量重置脱困）。
 * 2. cameraLevel = 'whole' 只允许出现在相机真正回到全身构图之后
 *    （viewer.reset() / 系统切回全部人体）；单纯的解除选择不移动相机，
 *    不得谎报 WHOLE BODY。
 */

export type AnatomyCameraLevel = 'whole' | 'system' | 'structure';
export type AnatomyIsolationMode = 'selected' | 'parent-context';

/** 解除选择（Escape / 点击空白 / 隐藏选中 / 筛选冲突退选）后的决策。 */
export function planDeselect(input: {
  isolation: VanatomeIsolationState | null;
}): { exitIsolation: boolean } {
  return { exitIsolation: input.isolation !== null };
}

/**
 * 选中一个结构后的决策。
 *
 * - 相机构图层级跟随结构种类（system 节点 → SYSTEM FRAME，其余 → STRUCTURE FOCUS）。
 * - 新选中结构仍在隔离分支内时保留隔离（在隔离语境里继续下钻）；
 *   落在分支外（例如隔离肺时从 Explorer 树点击股骨）必须退出隔离，
 *   否则新选中结构不可见、相机拒绝对焦（structure-has-no-visible-geometry）。
 */
export function planStructureSelect(input: {
  kind: VanatomeStructure['kind'] | undefined;
  isolation: VanatomeIsolationState | null;
  withinIsolatedBranch: boolean;
}): {
  cameraLevel: AnatomyCameraLevel;
  isolation: VanatomeIsolationState | null;
} {
  const isolation =
    input.isolation && input.withinIsolatedBranch ? input.isolation : null;
  return {
    cameraLevel: input.kind === 'system' ? 'system' : 'structure',
    isolation,
  };
}

/**
 * 通过"保留语境 / 隔离"按钮切换隔离状态。
 *
 * 对同一结构重复点击同一模式 = 退出该隔离（显式开关语义）；
 * 点击另一模式 = 在两种隔离语境间切换。
 * 没有选中锚点时不产生新的隔离（按钮此时本应禁用，这里兜底）。
 */
export function planIsolationToggle(input: {
  selectedId: string | null;
  isolation: VanatomeIsolationState | null;
  id: string;
  mode: AnatomyIsolationMode;
}): { isolation: VanatomeIsolationState | null } {
  if (!input.selectedId) return { isolation: input.isolation };
  if (
    input.isolation &&
    input.isolation.id === input.id &&
    input.isolation.mode === input.mode
  ) {
    return { isolation: null };
  }
  return { isolation: { id: input.id, mode: input.mode } };
}

/**
 * 相机全量复位（viewer.reset()）后的决策。
 * 这是唯一允许 cameraLevel 回到 'whole' 的转换。
 */
export function planCameraReset(): {
  selectedId: null;
  isolation: null;
  cameraLevel: AnatomyCameraLevel;
} {
  return { selectedId: null, isolation: null, cameraLevel: 'whole' };
}

/** 死局检测：隔离残留但没有任何选中锚点（结构操作按钮全部不可用）。 */
export function isolationOrphaned(input: {
  selectedId: string | null;
  isolation: VanatomeIsolationState | null;
}): boolean {
  return input.isolation !== null && input.selectedId === null;
}
