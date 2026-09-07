import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// ============================================================================
// Camera Patch 契约测试（Deep Assurance #002 · Track H）
//
// scripts/patch-vanatome-camera.mjs 在 postinstall 阶段直接改写第三方包
// @vixotic/vanatome-react 的编译产物（DECISIONS.md D-003）。这是全项目最
// 脆弱的关键资产：上游版本一变，patch anchor 即失效。
//
// 本文件验证「patch 已生效且契约满足」三层：
//   1. 存在性 —— focus guard + 当前 bundle 的全局 distance contract 均在，
//                旧的缩小 maxDistance 令牌已消失
//   2. 语义顺序 —— focus guard 必须先于 selectedId 判断（否则行为反转）
//   3. 幂等重跑 —— 对已 patch 的安装再次执行脚本必须 exit 0 且逐字节不变
//   4. 版本契约 —— 安装的 vanatome-react/atlas 版本满足根 package.json 范围
//
// 不测试"未安装/被升级"场景：那种失败由 patch 脚本自身 loudly throw 承担。
// ============================================================================

const repoRoot = process.cwd();
const viewerPath = path.join(repoRoot, 'node_modules/@vixotic/vanatome-react/dist/VanatomeViewer.js');
const patchScriptPath = path.join(repoRoot, 'scripts/patch-vanatome-camera.mjs');

const readViewerSource = () => readFileSync(viewerPath, 'utf8');

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

/** 手写 ^x.y.z caret 范围判定（项目无 semver 依赖，不为此引入）。 */
function satisfiesCaret(version: string, range: string): boolean {
  const match = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(range);
  if (!match) return false;
  const [major, minor, patch] = version.split('.').map(Number);
  const [baseMajor, baseMinor, basePatch] = [match[1], match[2], match[3]].map(Number);
  if (Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch)) return false;
  if (major !== baseMajor) return false;
  if (major > 0) return minor >= baseMinor;
  if (baseMinor > 0) return minor === baseMinor && patch >= basePatch;
  return minor === 0 && patch >= basePatch;
}

describe('camera patch 契约（@vixotic/vanatome-react 安装态）', () => {
  it('存在性：focus guard 与当前全局 distance contract 均在编译产物中', () => {
    const source = readViewerSource();

    expect(source).toContain('const previousFocusKey = useRef(focusRequestKey);');
    expect(source).toContain('if (previousFocusKey.current === focusRequestKey)');
    expect(source).toContain(
      'minimumDistance: focusDistance,\n            minDistance,\n            maxDistance,\n        });',
    );
    expect(source).toContain('minDistance: minDistance, maxDistance: maxDistance');
  });

  it('存在性：旧的动态缩小 maxDistance 令牌必须已消失', () => {
    const source = readViewerSource();

    expect(source).not.toContain(
      'max: Math.min(maxDistance, Math.max(distance * 12, sphere.radius * 9)),',
    );
  });

  it('语义顺序：focus guard 出现在 selectedId 判断之前（顺序错 = 相机行为反转）', () => {
    const source = readViewerSource();
    const guardIndex = source.indexOf('if (previousFocusKey.current === focusRequestKey)');
    const selectedIdIndex = source.indexOf('if (!selectedId)');

    expect(guardIndex).toBeGreaterThan(-1);
    expect(selectedIdIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeLessThan(selectedIdIndex);
  });

  it('幂等重跑：对已 patch 的安装再次执行脚本 → exit 0 且文件逐字节不变', () => {
    const before = sha256(readViewerSource());

    execFileSync('node', [patchScriptPath], { cwd: repoRoot });

    expect(sha256(readViewerSource())).toBe(before);
  });

  it('版本契约：安装的 vanatome-react / vanatome-atlas 满足根 package.json 的 caret 范围', () => {
    const rootPackage = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    const reactSpec = rootPackage.dependencies['@vixotic/vanatome-react'];
    const atlasSpec = rootPackage.dependencies['@vixotic/vanatome-atlas'];

    const reactInstalled = (
      JSON.parse(readFileSync(path.join(repoRoot, 'node_modules/@vixotic/vanatome-react/package.json'), 'utf8')) as { version: string }
    ).version;
    const atlasInstalled = (
      JSON.parse(readFileSync(path.join(repoRoot, 'node_modules/@vixotic/vanatome-atlas/package.json'), 'utf8')) as { version: string }
    ).version;

    expect(satisfiesCaret(reactInstalled, reactSpec)).toBe(true);
    expect(satisfiesCaret(atlasInstalled, atlasSpec)).toBe(true);
  });

  it('接线契约：根 package.json 的 postinstall 确实指向 patch 脚本', () => {
    const rootPackage = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(rootPackage.scripts.postinstall).toContain('patch-vanatome-camera.mjs');
  });
});
