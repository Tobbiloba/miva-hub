"use client";

import { appStore } from "@/app/store";
import { ToolsInfoDrawer } from "@/components/tools-info-drawer";
import { ReactNode, useMemo } from "react";
import { useShallow } from "zustand/shallow";

export function ToolsInfoDrawerProvider({ children }: { children: ReactNode }) {
  const [toolsInfoDrawer, appStoreMutate] = appStore(
    useShallow((state) => [state.toolsInfoDrawer, state.mutate]),
  );

  const handleClose = useMemo(
    () => () => {
      appStoreMutate((_state) => ({
        toolsInfoDrawer: {
          isOpen: false,
        },
      }));
    },
    [appStoreMutate],
  );

  return (
    <>
      {children}
      <ToolsInfoDrawer isOpen={toolsInfoDrawer.isOpen} onClose={handleClose} />
    </>
  );
}
