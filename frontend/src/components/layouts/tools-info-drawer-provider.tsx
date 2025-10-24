"use client";

import { ReactNode, useMemo } from "react";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import { ToolsInfoDrawer } from "@/components/tools-info-drawer";

export function ToolsInfoDrawerProvider({ children }: { children: ReactNode }) {
  const [toolsInfoDrawer, appStoreMutate] = appStore(
    useShallow((state) => [state.toolsInfoDrawer, state.mutate]),
  );

  const handleClose = useMemo(
    () => () => {
      appStoreMutate((state) => ({
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
      <ToolsInfoDrawer
        isOpen={toolsInfoDrawer.isOpen}
        onClose={handleClose}
      />
    </>
  );
}
