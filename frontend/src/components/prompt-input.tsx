"use client";

import { appStore } from "@/app/store";
import { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import { ChatMention, ChatModel } from "app-types/chat";
import {
  MAX_IMAGES_PER_MESSAGE,
  OPEN_PHOTO_PICKER_EVENT,
} from "lib/chat/attachments";
import { compressImage } from "lib/chat/compress-image";
import {
  ArrowUp,
  AudioWaveformIcon,
  ChevronDown,
  ImagePlusIcon,
  Loader2,
  Square,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "ui/button";
import { useShallow } from "zustand/shallow";
import { CourseContextSelector } from "./course-context-selector";
import { SelectModel } from "./select-model";
import { ToolModeDropdown } from "./tool-mode-dropdown";

import { Editor } from "@tiptap/react";
import { authClient } from "auth/client";
import { DefaultToolName } from "lib/ai/tools";
import equal from "lib/equal";
import { cn } from "lib/utils";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { ClaudeIcon } from "ui/claude-icon";
import { GeminiIcon } from "ui/gemini-icon";
import { GrokIcon } from "ui/grok-icon";
import { MCPIcon } from "ui/mcp-icon";
import { OpenAIIcon } from "ui/openai-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { DefaultToolIcon } from "./default-tool-icon";
import { ToolSelectDropdown } from "./tool-select-dropdown";

import { AgentSummary } from "app-types/agent";
import { EMOJI_DATA } from "lib/const";

interface PromptInputProps {
  placeholder?: string;
  setInput: (value: string) => void;
  input: string;
  onStop: () => void;
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
  toolDisabled?: boolean;
  isLoading?: boolean;
  model?: ChatModel;
  setModel?: (model: ChatModel) => void;
  voiceDisabled?: boolean;
  threadId?: string;
  disabledMention?: boolean;
  onFocus?: () => void;
  /** Photos need /api/chat (temporary chat and demos don't resolve them) */
  attachmentsDisabled?: boolean;
}

/** A photo in the composer, uploaded as soon as it's added. */
type Attachment = {
  id: string;
  preview: string;
  status: "uploading" | "ready" | "error";
  url?: string;
  mediaType?: string;
};

const DEFAULT_PHOTO_PROMPT = "Help me work through this question.";

const ChatMentionInput = dynamic(() => import("./chat-mention-input"), {
  ssr: false,
  loading() {
    return <div className="h-[2rem] w-full animate-pulse"></div>;
  },
});

export default function PromptInput({
  placeholder,
  sendMessage,
  model,
  setModel,
  input,
  onFocus,
  setInput,
  onStop,
  isLoading,
  toolDisabled,
  voiceDisabled,
  threadId,
  disabledMention,
  attachmentsDisabled,
}: PromptInputProps) {
  const t = useTranslations("Chat");
  const { data: session } = authClient.useSession();
  const isStudent =
    (session?.user as { role?: string } | undefined)?.role === "student";

  const [globalModel, threadMentions, appStoreMutate] = appStore(
    useShallow((state) => [
      state.chatModel,
      state.threadMentions,
      state.mutate,
    ]),
  );

  const mentions = useMemo<ChatMention[]>(() => {
    if (!threadId) return [];
    return threadMentions[threadId!] ?? [];
  }, [threadMentions, threadId]);

  const chatModel = useMemo(() => {
    return model ?? globalModel;
  }, [model, globalModel]);

  const editorRef = useRef<Editor | null>(null);

  // ── Photos (Snap-to-Solve) ────────────────────────────────────────────
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const attachmentsRef = useRef<Attachment[]>([]);
  attachmentsRef.current = attachments;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUploading = attachments.some((a) => a.status === "uploading");

  const patchAttachment = useCallback(
    (id: string, patch: Partial<Attachment>) =>
      setAttachments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      ),
    [],
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const gone = prev.find((a) => a.id === id);
      if (gone) URL.revokeObjectURL(gone.preview);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const addFiles = useCallback(
    (files: File[]) => {
      if (attachmentsDisabled) return;
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (!images.length) return;
      const room = MAX_IMAGES_PER_MESSAGE - attachmentsRef.current.length;
      if (room <= 0 || images.length > room) {
        toast.info(`You can add up to ${MAX_IMAGES_PER_MESSAGE} photos.`);
      }
      for (const file of images.slice(0, Math.max(room, 0))) {
        const id = crypto.randomUUID();
        setAttachments((prev) => [
          ...prev,
          { id, preview: URL.createObjectURL(file), status: "uploading" },
        ]);
        (async () => {
          try {
            const blob = await compressImage(file);
            const body = new FormData();
            body.append("file", blob, "photo.jpg");
            const res = await fetch("/api/chat/attachments", {
              method: "POST",
              body,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Upload failed");
            patchAttachment(id, {
              status: "ready",
              url: data.url,
              mediaType: data.mediaType,
            });
          } catch (error) {
            patchAttachment(id, { status: "error" });
            toast.error(
              error instanceof Error
                ? error.message
                : "Couldn't upload the photo. Try again.",
            );
          }
        })();
      }
    },
    [attachmentsDisabled, patchAttachment],
  );

  useEffect(
    () => () =>
      attachmentsRef.current.forEach((a) => URL.revokeObjectURL(a.preview)),
    [],
  );

  // "Snap a question" starter on the empty chat opens the picker
  useEffect(() => {
    if (attachmentsDisabled) return;
    const open = () => fileInputRef.current?.click();
    window.addEventListener(OPEN_PHOTO_PICKER_EVENT, open);
    return () => window.removeEventListener(OPEN_PHOTO_PICKER_EVENT, open);
  }, [attachmentsDisabled]);

  const setChatModel = useCallback(
    (model: ChatModel) => {
      if (setModel) {
        setModel(model);
      } else {
        appStoreMutate({ chatModel: model });
      }
    },
    [setModel, appStoreMutate],
  );

  const deleteMention = useCallback(
    (mention: ChatMention) => {
      if (!threadId) return;
      appStoreMutate((prev) => {
        const newMentions = mentions.filter((m) => !equal(m, mention));
        return {
          threadMentions: {
            ...prev.threadMentions,
            [threadId!]: newMentions,
          },
        };
      });
    },
    [mentions, threadId],
  );

  const addMention = useCallback(
    (mention: ChatMention) => {
      if (!threadId) return;
      appStoreMutate((prev) => {
        if (mentions.some((m) => equal(m, mention))) return prev;

        const newMentions =
          mention.type == "agent"
            ? [...mentions.filter((m) => m.type !== "agent"), mention]
            : [...mentions, mention];

        return {
          threadMentions: {
            ...prev.threadMentions,
            [threadId!]: newMentions,
          },
        };
      });
    },
    [mentions, threadId],
  );

  const onSelectAgent = useCallback(
    (agent: AgentSummary) => {
      appStoreMutate((prev) => {
        return {
          threadMentions: {
            ...prev.threadMentions,
            [threadId!]: [
              {
                type: "agent",
                name: agent.name,
                icon: agent.icon,
                description: agent.description,
                agentId: agent.id,
              },
            ],
          },
        };
      });
    },
    [mentions, threadId],
  );

  const onChangeMention = useCallback(
    (mentions: ChatMention[]) => {
      let hasAgent = false;
      [...mentions]
        .reverse()
        .filter((m) => {
          if (m.type == "agent") {
            if (hasAgent) return false;
            hasAgent = true;
          }

          return true;
        })
        .reverse()
        .forEach(addMention);
    },
    [addMention],
  );

  const submit = () => {
    if (isLoading) return;
    if (isUploading) {
      toast.info("Your photo is still uploading.");
      return;
    }
    const ready = attachments.filter((a) => a.status === "ready");
    const userMessage = input?.trim() || "";
    if (userMessage.length === 0 && ready.length === 0) return;
    setInput("");
    attachments.forEach((a) => URL.revokeObjectURL(a.preview));
    setAttachments([]);
    sendMessage({
      role: "user",
      parts: [
        ...ready.map((a) => ({
          type: "file" as const,
          mediaType: a.mediaType!,
          url: a.url!,
          filename: "photo.jpg",
        })),
        {
          type: "text",
          text: userMessage || DEFAULT_PHOTO_PROMPT,
        },
      ],
    });
  };

  // Handle ESC key to clear mentions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mentions.length > 0 && threadId) {
        e.preventDefault();
        e.stopPropagation();
        appStoreMutate((prev) => ({
          threadMentions: {
            ...prev.threadMentions,
            [threadId]: [],
          },
          agentId: undefined,
        }));
        editorRef.current?.commands.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mentions.length, threadId, appStoreMutate]);

  useEffect(() => {
    if (!editorRef.current) return;
  }, [editorRef.current]);

  return (
    <div className="max-w-[52rem] mx-auto fade-in animate-in">
      <div className="z-10 mx-auto w-full max-w-[52rem] relative">
        <fieldset
          className="flex w-full min-w-0 max-w-full flex-col px-4"
          onPasteCapture={(e) => {
            const files = Array.from(e.clipboardData?.files ?? []);
            if (
              attachmentsDisabled ||
              !files.some((f) => f.type.startsWith("image/"))
            )
              return;
            e.preventDefault();
            addFiles(files);
          }}
          onDragOver={(e) => {
            if (!attachmentsDisabled && e.dataTransfer.types.includes("Files"))
              e.preventDefault();
          }}
          onDrop={(e) => {
            if (attachmentsDisabled || !e.dataTransfer.files.length) return;
            e.preventDefault();
            addFiles(Array.from(e.dataTransfer.files));
          }}
        >
          <div className="relative z-10 flex w-full cursor-text flex-col items-stretch overflow-hidden rounded-[20px] border border-border bg-card shadow-[var(--shadow-float)] transition-[border-color,box-shadow] duration-200 focus-within:border-input">
            {mentions.length > 0 && (
              <div className="m-2 flex flex-col gap-4 rounded-xl border bg-secondary p-3">
                {mentions.map((mention, i) => {
                  return (
                    <div key={i} className="flex items-center gap-2">
                      {mention.type === "workflow" ||
                      mention.type === "agent" ? (
                        <Avatar
                          className="size-6 p-1 ring ring-border rounded-full flex-shrink-0"
                          style={mention.icon?.style}
                        >
                          <AvatarImage
                            src={
                              mention.icon?.value ||
                              EMOJI_DATA[i % EMOJI_DATA.length]
                            }
                          />
                          <AvatarFallback>
                            {mention.name.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <Button className="size-6 flex items-center justify-center ring ring-border rounded-full flex-shrink-0 p-0.5">
                          {mention.type == "mcpServer" ? (
                            <MCPIcon className="size-3.5" />
                          ) : (
                            <DefaultToolIcon
                              name={mention.name as DefaultToolName}
                              className="size-3.5"
                            />
                          )}
                        </Button>
                      )}

                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-semibold truncate">
                          {mention.name}
                        </span>
                        {mention.description ? (
                          <span className="text-muted-foreground text-xs truncate">
                            {mention.description}
                          </span>
                        ) : null}
                      </div>
                      <Button
                        variant={"ghost"}
                        size={"icon"}
                        disabled={!threadId}
                        className="rounded-full hover:bg-input! flex-shrink-0"
                        onClick={() => {
                          deleteMention(mention);
                        }}
                      >
                        <XIcon />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            {attachments.length > 0 && (
              <ul
                className="flex gap-2 px-4 pt-3.5"
                aria-label="Attached photos"
              >
                {attachments.map((a) => (
                  <li
                    key={a.id}
                    className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary"
                  >
                    <img
                      src={a.preview}
                      alt="Attached photo"
                      className={cn(
                        "size-full object-cover",
                        a.status !== "ready" && "opacity-60",
                      )}
                    />
                    {a.status === "uploading" && (
                      <span className="absolute inset-0 grid place-items-center">
                        <Loader2 className="size-5 animate-spin text-foreground" />
                      </span>
                    )}
                    {a.status === "error" && (
                      <span
                        className="absolute inset-0 grid place-items-center bg-destructive/20"
                        title="Upload failed"
                      >
                        <TriangleAlertIcon className="size-5 text-destructive" />
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label="Remove photo"
                      onClick={() => removeAttachment(a.id)}
                      className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="px-4 pt-3.5 pb-1">
              <div className="relative min-h-[2.75rem] min-w-0 text-[15px]">
                <ChatMentionInput
                  input={input}
                  onChange={setInput}
                  onChangeMention={onChangeMention}
                  onEnter={submit}
                  placeholder={placeholder ?? t("placeholder")}
                  ref={editorRef}
                  disabledMention={disabledMention}
                  onFocus={onFocus}
                />
              </div>
            </div>
            <div className="z-30 flex w-full min-w-0 items-center gap-0.5 overflow-x-auto px-2 pb-2 text-muted-foreground [scrollbar-width:none]">
              {!attachmentsDisabled && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => {
                      addFiles(Array.from(e.target.files ?? []));
                      e.target.value = "";
                    }}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={"ghost"}
                        size={"sm"}
                        aria-label="Add a photo of a question"
                        className="rounded-lg p-2! text-muted-foreground"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <ImagePlusIcon />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add a photo of a question</TooltipContent>
                  </Tooltip>
                </>
              )}

              {!toolDisabled && (
                <>
                  {/* Tool wiring is a staff control; students just chat */}
                  {!isStudent && <ToolModeDropdown />}
                  {!isStudent && (
                    <ToolSelectDropdown
                      className="mx-1"
                      align="start"
                      side="top"
                      onSelectAgent={onSelectAgent}
                      mentions={mentions}
                    />
                  )}
                  <CourseContextSelector />
                </>
              )}

              <div className="flex-1" />

              <SelectModel onSelect={setChatModel} currentModel={chatModel}>
                <Button
                  variant={"ghost"}
                  size={"sm"}
                  className="group rounded-lg data-[state=open]:bg-accent"
                  data-testid="model-selector-button"
                >
                  {chatModel?.model ? (
                    <>
                      {chatModel.provider === "openai" ? (
                        <OpenAIIcon className="size-3" />
                      ) : chatModel.provider === "xai" ? (
                        <GrokIcon className="size-3" />
                      ) : chatModel.provider === "anthropic" ? (
                        <ClaudeIcon className="size-3" />
                      ) : chatModel.provider === "google" ? (
                        <GeminiIcon className="size-3" />
                      ) : null}
                      <span
                        className="text-xs text-foreground"
                        data-testid="selected-model-name"
                      >
                        {chatModel.model}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">model</span>
                  )}

                  <ChevronDown className="size-3" />
                </Button>
              </SelectModel>
              {!isLoading &&
              !input.length &&
              !attachments.length &&
              !voiceDisabled ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size={"icon"}
                      aria-label={t("VoiceChat.title")}
                      onClick={() => {
                        appStoreMutate((state) => ({
                          voiceChat: {
                            ...state.voiceChat,
                            isOpen: true,
                            agentId: undefined,
                          },
                        }));
                      }}
                      className="ml-1 size-8 shrink-0 rounded-full"
                    >
                      <AudioWaveformIcon size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("VoiceChat.title")}</TooltipContent>
                </Tooltip>
              ) : (
                <button
                  type="button"
                  aria-label={isLoading ? "Stop" : "Send message"}
                  onClick={() => {
                    if (isLoading) {
                      onStop();
                    } else {
                      submit();
                    }
                  }}
                  className={cn(
                    "fade-in animate-in ml-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full transition-colors duration-150",
                    isLoading
                      ? "bg-secondary text-foreground hover:bg-accent"
                      : "bg-energy text-energy-foreground hover:opacity-85",
                  )}
                >
                  {isLoading ? (
                    <Square size={12} className="fill-current" />
                  ) : (
                    <ArrowUp size={16} />
                  )}
                </button>
              )}
            </div>
          </div>
        </fieldset>
      </div>
    </div>
  );
}
