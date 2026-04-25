"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { useRouter } from "nextjs-toploader/app";

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type WorkspaceItem = {
  id: string;
  name: string;
  slug: string;
};

type WorkspaceSwitcherProps = {
  activeWorkspaceId: string;
  workspaces: WorkspaceItem[];
};

export function WorkspaceSwitcher({ activeWorkspaceId, workspaces }: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [value, setValue] = useState(activeWorkspaceId);
  const [isPending, setIsPending] = useState(false);

  const currentWorkspace = workspaces.find((workspace) => workspace.id === value);

  const handleSwitch = async (nextWorkspaceId: string | null) => {
    if (!nextWorkspaceId || nextWorkspaceId === value || isPending) {
      return;
    }

    setIsPending(true);
    try {
      const response = await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workspaceId: nextWorkspaceId }),
      });

      if (!response.ok) {
        throw new Error("Falha ao trocar de workspace.");
      }

      setValue(nextWorkspaceId);
      router.refresh();
    } catch {
      setValue(activeWorkspaceId);
    } finally {
      setIsPending(false);
    }
  };

  if (workspaces.length <= 1) {
    return (
      <div className="flex min-w-0 items-center gap-2 rounded-md border border-border/70 bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
        <Building2 className="size-3.5" />
        <span className="truncate">{currentWorkspace?.name ?? "Workspace"}</span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={handleSwitch} disabled={isPending}>
      <SelectTrigger className="h-8 min-w-56 max-w-72 bg-background/60">
        <SelectValue>
          <span className="flex min-w-0 items-center gap-2">
            <Building2 className="size-3.5 text-muted-foreground" />
            <span className="truncate">{currentWorkspace?.name ?? "Selecionar workspace"}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {workspaces.map((workspace) => (
            <SelectItem key={workspace.id} value={workspace.id}>
              {workspace.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
