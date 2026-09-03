import type { KnowledgeGraphInput, KnowledgeGraphReport } from '@/lib/knowledge-graph-validator';
import { validateKnowledgeGraph } from '@/lib/knowledge-graph-validator';
import {
  knowledgeNodes as anatomyKnowledgeNodes,
  modelNodeMap,
} from '@/data/knowledge/anatomy';
import { plantKnowledgeNodes } from '@/data/knowledge/plants';
import { sharedKnowledgeNodeIds } from '@/data/knowledge';
import {
  lightReactionSteps,
  microStructureTerms,
  photosynthesisScenes,
} from '@/data/photosynthesis/micro-lab';

/**
 * BioScope 真实知识数据的验证入口（接线层，不含验证逻辑）。
 *
 * 执行方式说明：本项目数据层使用 '@/' 路径别名与无扩展名相对导入
 * （data/knowledge/index.ts → './anatomy' 等），Node 的 TS type-stripping
 * 无法解析这些导入，而数据文件不可修改。因此本接线模块经由 vitest
 * （项目内唯一能解析该导入图的既有基础设施）执行：
 *
 *   npm run validate:knowledge        # = vitest run tests/knowledge-graph.test.ts
 *
 * 合并顺序刻意与 data/knowledge/index.ts 的 {...anatomy, ...plants} 保持一致，
 * 使 MERGE_COLLISION 检测反映真实覆盖行为。
 */
export function buildBioScopeKnowledgeGraphInput(): KnowledgeGraphInput {
  return {
    registries: [
      { name: 'anatomy', nodes: anatomyKnowledgeNodes },
      { name: 'plants', nodes: plantKnowledgeNodes },
    ],
    sharedKnowledgeNodeIds,
    modelNodeMap,
    microLab: {
      microStructureTerms,
      scenes: photosynthesisScenes,
      steps: lightReactionSteps,
    },
    // 第 2 层（Vanatome atlas / micro-lab 结构 id 存在性）需要远端 catalog，
    // 本阶段刻意不传 knownStructureIds：modelReferenceChecks = 'skipped'。
  };
}

export function runBioScopeKnowledgeGraph(): KnowledgeGraphReport {
  return validateKnowledgeGraph(buildBioScopeKnowledgeGraphInput());
}

const severityOrder: Record<KnowledgeGraphReport['errors'][number]['severity'], string> = {
  error: 'ERROR',
  warning: 'WARNING',
  info: 'INFO',
};

/** 确定性文本输出：相同数据每次运行逐字节一致，供 CI / Agent 比对。 */
export function formatKnowledgeGraphReport(report: KnowledgeGraphReport): string {
  const lines: string[] = [];
  lines.push(`nodes: ${report.nodeCount}`);
  lines.push(`relations: ${report.relationCount}`);
  lines.push(`errors: ${report.errors.length}`);
  lines.push(`warnings: ${report.warnings.length}`);
  lines.push(`infos: ${report.infos.length}`);
  lines.push(`model reference checks: ${report.modelReferenceChecks}`);
  for (const issue of [...report.errors, ...report.warnings, ...report.infos]) {
    lines.push(`[${severityOrder[issue.severity]}] ${issue.code}: ${issue.message}`);
  }
  return lines.join('\n');
}
