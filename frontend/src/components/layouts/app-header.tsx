"use client";

import {
  AudioWaveformIcon,
  ChevronDown,
  Info,
  MessageCircleDashed,
  PanelLeft,
} from "lucide-react";
import { Button } from "ui/button";
import { useSidebar } from "ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";

import { appStore } from "@/app/store";
import { Shortcuts, getShortcutKeyList } from "lib/keyboard-shortcuts";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { TextShimmer } from "ui/text-shimmer";
import { useShallow } from "zustand/shallow";
import { ThreadDropdown } from "../thread-dropdown";

export function AppHeader() {
  const t = useTranslations();
  const [appStoreMutate] = appStore(useShallow((state) => [state.mutate]));
  const { toggleSidebar, open, isMobile } = useSidebar();
  const currentPaths = usePathname();

  const componentByPage = useMemo(() => {
    if (currentPaths.startsWith("/chat/")) {
      return <ThreadDropdownComponent />;
    }
  }, [currentPaths]);

  const title = useMemo(() => pageTitle(currentPaths), [currentPaths]);
  const iconButton =
    "size-9 rounded-xl border border-border bg-card text-muted-foreground shadow-[var(--shadow-soft)] hover:bg-secondary hover:text-foreground";

  return (
    <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 px-4 md:px-5">
      {(!open || isMobile) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle Sidebar"
              onClick={toggleSidebar}
              data-testid="sidebar-toggle"
              className={iconButton}
            >
              <PanelLeft />
            </Button>
          </TooltipTrigger>
          <TooltipContent align="start" side="bottom">
            <div className="flex items-center gap-2">
              {t("KeyboardShortcuts.toggleSidebar")}
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                {getShortcutKeyList(Shortcuts.toggleSidebar).map((key) => (
                  <span
                    key={key}
                    className="w-5 h-5 flex items-center justify-center bg-muted rounded "
                  >
                    {key}
                  </span>
                ))}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      )}

      {componentByPage ??
        (title && (
          <p className="truncate font-display text-lg font-semibold">{title}</p>
        ))}
      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size={"icon"}
              variant={"ghost"}
              aria-label="Available tools"
              className={iconButton}
              onClick={() => {
                appStoreMutate((_state) => ({
                  toolsInfoDrawer: {
                    isOpen: true,
                  },
                }));
              }}
            >
              <Info className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent align="end" side="bottom">
            <div className="text-xs">View Available Tools & Demos</div>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size={"icon"}
              variant={"ghost"}
              aria-label="Voice chat"
              className={iconButton}
              onClick={() => {
                appStoreMutate((state) => ({
                  voiceChat: {
                    ...state.voiceChat,
                    isOpen: true,
                    agentId: undefined,
                  },
                }));
              }}
            >
              <AudioWaveformIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent align="end" side="bottom">
            <div className="text-xs flex items-center gap-2">
              {t("KeyboardShortcuts.toggleVoiceChat")}
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                {getShortcutKeyList(Shortcuts.toggleVoiceChat).map((key) => (
                  <span
                    className="w-5 h-5 flex items-center justify-center bg-muted rounded "
                    key={key}
                  >
                    {key}
                  </span>
                ))}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size={"icon"}
              variant={"ghost"}
              aria-label="Temporary chat"
              className={iconButton}
              onClick={() => {
                appStoreMutate((state) => ({
                  temporaryChat: {
                    ...state.temporaryChat,
                    isOpen: !state.temporaryChat.isOpen,
                  },
                }));
              }}
            >
              <MessageCircleDashed className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent align="end" side="bottom">
            <div className="text-xs flex items-center gap-2">
              {t("KeyboardShortcuts.toggleTemporaryChat")}
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                {getShortcutKeyList(Shortcuts.toggleTemporaryChat).map(
                  (key) => (
                    <span
                      className="w-5 h-5 flex items-center justify-center bg-muted rounded "
                      key={key}
                    >
                      {key}
                    </span>
                  ),
                )}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}

// Pages carry their own heading inside the panel; only the chat needs one here.
function pageTitle(pathname: string): string {
  return pathname === "/" || pathname.startsWith("/chat") ? "Chat" : "";
}

function ThreadDropdownComponent() {
  const [threadList, currentThreadId, generatingTitleThreadIds] = appStore(
    useShallow((state) => [
      state.threadList,
      state.currentThreadId,
      state.generatingTitleThreadIds,
    ]),
  );
  const currentThread = useMemo(() => {
    return threadList.find((thread) => thread.id === currentThreadId);
  }, [threadList, currentThreadId]);

  useEffect(() => {
    if (currentThread?.id) {
      document.title = currentThread.title || "New Chat";
    }
  }, [currentThread?.id]);

  if (!currentThread) return null;

  return (
    <div className="flex min-w-0 items-center gap-1">
      <ThreadDropdown
        threadId={currentThread.id}
        beforeTitle={currentThread.title}
      >
        <div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="-ml-2 flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 font-display text-lg font-semibold hover:bg-card hover:text-foreground data-[state=open]:bg-card"
              >
                {generatingTitleThreadIds.includes(currentThread.id) ? (
                  <TextShimmer className="truncate max-w-60 min-w-0 mr-1">
                    {currentThread.title || "New Chat"}
                  </TextShimmer>
                ) : (
                  <p className="truncate max-w-60 min-w-0 mr-1">
                    {currentThread.title || "New Chat"}
                  </p>
                )}

                <ChevronDown size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[200px] p-4 break-all overflow-y-auto max-h-[200px]">
              {currentThread.title || "New Chat"}
            </TooltipContent>
          </Tooltip>
        </div>
      </ThreadDropdown>
    </div>
  );
}
