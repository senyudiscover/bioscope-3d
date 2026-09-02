import type { ReactNode } from 'react';

/**
 * Shared frame for future mechanism-oriented modules. The slots deliberately
 * keep viewer implementations independent (R3F now, other renderers later).
 */
export function MicroLabWorkspace({
  header,
  explorer,
  visual,
  knowledge,
  related,
}: {
  header: ReactNode;
  explorer: ReactNode;
  visual: ReactNode;
  knowledge: ReactNode;
  related: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col overflow-hidden bg-[#090b0a] text-zinc-100">
      {header}
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_auto_auto_auto] lg:grid-cols-[250px_minmax(500px,1fr)_350px] lg:grid-rows-[minmax(0,1fr)_108px]">
        {explorer}
        {visual}
        {knowledge}
        {related}
      </div>
    </main>
  );
}
