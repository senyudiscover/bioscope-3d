import { describe, expect, it } from 'vitest';
import type { VanatomeIsolationState } from '@vixotic/vanatome-react';
import {
  isolationOrphaned,
  planCameraReset,
  planDeselect,
  planIsolationToggle,
  planStructureSelect,
} from '@/lib/anatomy-interaction-state';

// ============================================================================
// 回归基线：3D Explore 交互状态机（Explore Interaction Pass，2026-09-07）
//
// 修复的浏览器 QA 实录 Bug：
//   选中肺 → 保留语境（isolate parent-context）→ Escape 清除 selection
//   → isolation 残留、结构操作按钮全部 disabled、相机指示器谎报
//   "WHOLE BODY"（实际相机仍停在肺部特写）→ 用户只能全量重置脱困。
//
// 本文件固化 lib/anatomy-interaction-state.ts 的决策规则：
//   R1 解除选择必须一并退出隔离（隔离的所有管理入口都以选中为前提）；
//   R2 解除选择不改变 cameraLevel（相机没有移动，不得谎报 WHOLE BODY）；
//   R3 选中分支外结构必须退出隔离（否则新结构不可见、相机拒绝对焦）；
//   R4 重复点击同一隔离按钮 = 退出该隔离（显式开关语义）；
//   R5 cameraLevel = 'whole' 只能由 planCameraReset（viewer.reset 之后）产生。
// ============================================================================

const fadeLungs: VanatomeIsolationState = {
  id: 'lungs',
  mode: 'parent-context',
};

describe('planDeselect（R1 + R2）', () => {
  it('存在隔离时解除选择必须退出隔离', () => {
    expect(planDeselect({ isolation: fadeLungs }).exitIsolation).toBe(true);
  });

  it('没有隔离时解除选择不产生隔离动作', () => {
    expect(planDeselect({ isolation: null }).exitIsolation).toBe(false);
  });
});

describe('planStructureSelect（R2 + R3）', () => {
  it('器官选择进入 STRUCTURE FOCUS 层级', () => {
    const plan = planStructureSelect({
      kind: 'organ',
      isolation: null,
      withinIsolatedBranch: false,
    });
    expect(plan.cameraLevel).toBe('structure');
    expect(plan.isolation).toBeNull();
  });

  it('系统节点选择进入 SYSTEM FRAME 层级', () => {
    const plan = planStructureSelect({
      kind: 'system',
      isolation: null,
      withinIsolatedBranch: false,
    });
    expect(plan.cameraLevel).toBe('system');
  });

  it('kind 缺失时按结构层级处理，不得报 WHOLE BODY', () => {
    const plan = planStructureSelect({
      kind: undefined,
      isolation: null,
      withinIsolatedBranch: false,
    });
    expect(plan.cameraLevel).toBe('structure');
  });

  it('新选中结构在隔离分支内：保留隔离语境继续下钻', () => {
    const plan = planStructureSelect({
      kind: 'part',
      isolation: fadeLungs,
      withinIsolatedBranch: true,
    });
    expect(plan.isolation).toEqual(fadeLungs);
    expect(plan.cameraLevel).toBe('structure');
  });

  it('新选中结构在隔离分支外：必须退出隔离', () => {
    const plan = planStructureSelect({
      kind: 'part',
      isolation: fadeLungs,
      withinIsolatedBranch: false,
    });
    expect(plan.isolation).toBeNull();
  });
});

describe('planIsolationToggle（R4）', () => {
  it('同一结构重复同一模式 = 退出隔离', () => {
    const plan = planIsolationToggle({
      selectedId: 'lungs',
      isolation: fadeLungs,
      id: 'lungs',
      mode: 'parent-context',
    });
    expect(plan.isolation).toBeNull();
  });

  it('同一结构切换模式 = selected ↔ parent-context', () => {
    const plan = planIsolationToggle({
      selectedId: 'lungs',
      isolation: fadeLungs,
      id: 'lungs',
      mode: 'selected',
    });
    expect(plan.isolation).toEqual({ id: 'lungs', mode: 'selected' });
  });

  it('不同结构 = 切换隔离目标', () => {
    const plan = planIsolationToggle({
      selectedId: 'heart',
      isolation: fadeLungs,
      id: 'heart',
      mode: 'selected',
    });
    expect(plan.isolation).toEqual({ id: 'heart', mode: 'selected' });
  });

  it('没有选中锚点时不产生新隔离（按钮禁用态兜底）', () => {
    const plan = planIsolationToggle({
      selectedId: null,
      isolation: null,
      id: 'lungs',
      mode: 'selected',
    });
    expect(plan.isolation).toBeNull();
  });
});

describe('planCameraReset（R5）', () => {
  it('全量复位是唯一回到 WHOLE BODY 层级的转换', () => {
    expect(planCameraReset()).toEqual({
      selectedId: null,
      isolation: null,
      cameraLevel: 'whole',
    });
  });
});

describe('审计实录状态链：isolate → Escape → 恢复', () => {
  // 复现 QA 死局链路，断言修复后的终态。
  // 组件侧 wiring：Escape → onEscape → handleViewerSelect(null) →
  // selectStructure(null) → planDeselect + viewer.isolate(null) +
  // 不再调用 setCameraLevel('whole')。
  it('选中 → 保留语境 → Escape：隔离退出、无死局、指示器不谎报', () => {
    let selectedId: string | null = null;
    let isolation: VanatomeIsolationState | null = null;
    let cameraLevel: 'whole' | 'system' | 'structure' = 'whole';

    // 1. 用户点击肺部（器官）
    const selectPlan = planStructureSelect({
      kind: 'organ',
      isolation,
      withinIsolatedBranch: false,
    });
    isolation = selectPlan.isolation;
    cameraLevel = selectPlan.cameraLevel;
    selectedId = 'lungs';

    // 2. 用户点击"保留语境"
    isolation = planIsolationToggle({
      selectedId,
      isolation,
      id: 'lungs',
      mode: 'parent-context',
    }).isolation;
    expect(isolation).toEqual(fadeLungs);

    // 3. 用户按 Escape（清除选择）
    const deselectPlan = planDeselect({ isolation });
    if (deselectPlan.exitIsolation) isolation = null;
    selectedId = null;

    // 终态：selection 已清除、isolation 已退出、相机指示保持 STRUCTURE FOCUS。
    expect(selectedId).toBeNull();
    expect(isolation).toBeNull();
    expect(cameraLevel).toBe('structure');
    expect(
      isolationOrphaned({ selectedId, isolation }),
    ).toBe(false);
  });

  it('选中 → 隔离 → Explorer 树点击分支外结构：隔离退出且相机可对焦', () => {
    let isolation: VanatomeIsolationState | null = fadeLungs;
    // 隔离肺时从左侧树点击股骨（不在肺分支内）
    const plan = planStructureSelect({
      kind: 'part',
      isolation,
      withinIsolatedBranch: false,
    });
    isolation = plan.isolation;
    expect(isolation).toBeNull();
    expect(plan.cameraLevel).toBe('structure');
    expect(isolationOrphaned({ selectedId: 'femur', isolation })).toBe(false);
  });

  it('隔离期间在分支内下钻：隔离保留', () => {
    const plan = planStructureSelect({
      kind: 'part',
      isolation: fadeLungs,
      withinIsolatedBranch: true,
    });
    expect(plan.isolation).toEqual(fadeLungs);
    expect(isolationOrphaned({ selectedId: 'lungs-lobe-left', isolation: plan.isolation })).toBe(
      false,
    );
  });
});

describe('不变式巡检：任何转换后不得进入死局状态', () => {
  // 对一组确定性转换序列逐步断言：
  //   I1 isolation !== null ⇒ selectedId !== null（否则结构操作按钮全部禁用）
  //   I2 cameraLevel === 'whole' ⇒ selection 与 isolation 均为空
  //     （指示器只在相机真正回全身时才允许显示 WHOLE BODY）。
  const run = (
    steps: Array<
      | { action: 'select'; id: string; kind: 'organ' | 'part' | 'system'; within: boolean }
      | { action: 'deselect' }
      | { action: 'toggle'; id: string; mode: 'selected' | 'parent-context' }
      | { action: 'reset' }
    >,
  ) => {
    let selectedId: string | null = null;
    let isolation: VanatomeIsolationState | null = null;
    let cameraLevel: 'whole' | 'system' | 'structure' = 'whole';
    const assertInvariants = (step: string) => {
      expect(
        isolationOrphaned({ selectedId, isolation }),
        `I1 violated after ${step}`,
      ).toBe(false);
      if (cameraLevel === 'whole') {
        expect(selectedId, `I2 violated after ${step}`).toBeNull();
        expect(isolation, `I2 violated after ${step}`).toBeNull();
      }
    };
    for (const [index, step] of steps.entries()) {
      const label = `${index}:${step.action}`;
      if (step.action === 'select') {
        const plan = planStructureSelect({
          kind: step.kind,
          isolation,
          withinIsolatedBranch: step.within,
        });
        isolation = plan.isolation;
        cameraLevel = plan.cameraLevel;
        selectedId = step.id;
      } else if (step.action === 'deselect') {
        if (planDeselect({ isolation }).exitIsolation) isolation = null;
        selectedId = null;
      } else if (step.action === 'toggle') {
        isolation = planIsolationToggle({
          selectedId,
          isolation,
          id: step.id,
          mode: step.mode,
        }).isolation;
      } else {
        ({ selectedId, isolation, cameraLevel } = planCameraReset());
      }
      assertInvariants(label);
    }
    return { selectedId, isolation, cameraLevel };
  };

  it('混合探索序列全程保持不变式', () => {
    const finalState = run([
      { action: 'select', id: 'lungs', kind: 'organ', within: false },
      { action: 'toggle', id: 'lungs', mode: 'parent-context' },
      { action: 'select', id: 'lungs-lobe-left', kind: 'part', within: true },
      { action: 'toggle', id: 'lungs-lobe-left', mode: 'selected' },
      { action: 'toggle', id: 'lungs-lobe-left', mode: 'selected' }, // 再次点击 = 退出隔离
      { action: 'deselect' }, // Escape
      { action: 'select', id: 'heart', kind: 'organ', within: false },
      { action: 'toggle', id: 'heart', mode: 'selected' },
      { action: 'select', id: 'femur', kind: 'part', within: false }, // 分支外
      { action: 'reset' },
      { action: 'select', id: 'cardiovascular-system', kind: 'system', within: false },
      { action: 'deselect' },
    ]);
    expect(finalState.selectedId).toBeNull();
    expect(finalState.isolation).toBeNull();
    // 最后一次选择是系统节点（ cardiovascular-system ），deselect 不移动相机，
    // 指示器保持 SYSTEM FRAME 而不是谎报 WHOLE BODY。
    expect(finalState.cameraLevel).toBe('system');
  });
});
