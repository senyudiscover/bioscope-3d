'use client';

import { useMemo, useState } from 'react';
import { bioscopeModuleList, bioscopeModules } from '@/data/modules/registry';
import type { BioScopeModuleId, ModuleContext } from '@/lib/bioscope-core';

function AtlasSwitcher({
  value,
  onChange,
}: {
  value: BioScopeModuleId;
  onChange: (moduleId: BioScopeModuleId) => void;
}) {
  return (
    <div
      className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.025] p-1"
      aria-label="生命对象"
    >
      <span className="hidden px-2 font-mono text-[8px] tracking-[0.14em] text-zinc-700 2xl:inline">
        ATLAS
      </span>
      {bioscopeModuleList.map((module) => (
        <button
          key={module.id}
          type="button"
          onClick={() => onChange(module.id)}
          aria-pressed={value === module.id}
          title={module.description}
          className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
            value === module.id
              ? 'bg-coral text-[#1a0c09]'
              : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
          }`}
        >
          {module.titleZh}
          {module.status === 'experimental' && (
            <span className="ml-1.5 font-mono text-[8px] opacity-65">BETA</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function BioScopeWorkspace() {
  const [moduleContext, setModuleContext] = useState<ModuleContext>({
    moduleId: 'human-anatomy',
  });
  const activeModule = bioscopeModules[moduleContext.moduleId];
  const moduleSelector = useMemo(
    () => (
      <AtlasSwitcher
        value={moduleContext.moduleId}
        onChange={(moduleId) => setModuleContext({ moduleId })}
      />
    ),
    [moduleContext.moduleId],
  );
  const ActiveModule = activeModule.component;

  // 模块整体切换时以轻量淡入给出「已进入新工作台」的状态反馈。
  return (
    <div
      key={moduleContext.moduleId}
      className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
    >
      <ActiveModule moduleSelector={moduleSelector} />
    </div>
  );
}
