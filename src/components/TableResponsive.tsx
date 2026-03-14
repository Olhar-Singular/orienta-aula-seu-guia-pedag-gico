import type { ReactNode } from "react";

export default function TableResponsive({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="w-full overflow-x-auto -mx-4 sm:mx-0" role="region" aria-label={label || "Tabela de dados"} tabIndex={0}>
      <div className="min-w-[600px] px-4 sm:px-0">
        {children}
      </div>
    </div>
  );
}
