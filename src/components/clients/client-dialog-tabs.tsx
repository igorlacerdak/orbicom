"use client";

import { Button } from "@/components/ui/button";

type ClientDialogTab = "dados" | "endereco";

type ClientDialogTabsProps = {
  activeTab: ClientDialogTab;
  hasDadosErrors: boolean;
  hasEnderecoErrors: boolean;
  onTabChange: (tab: ClientDialogTab) => void;
};

export function ClientDialogTabs({
  activeTab,
  hasDadosErrors,
  hasEnderecoErrors,
  onTabChange,
}: ClientDialogTabsProps) {
  return (
    <div className="inline-flex rounded-lg border border-border p-1">
      <Button
        type="button"
        size="sm"
        variant={activeTab === "dados" ? "default" : "ghost"}
        onClick={() => onTabChange("dados")}
      >
        Dados{hasDadosErrors ? " - erro" : ""}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={activeTab === "endereco" ? "default" : "ghost"}
        onClick={() => onTabChange("endereco")}
      >
        Endereco{hasEnderecoErrors ? " - erro" : ""}
      </Button>
    </div>
  );
}

export type { ClientDialogTab };
