"use client";

import { useState, useEffect, useMemo } from 'react';
import { getToolName, isToolUIPart, UIMessage } from 'ai';
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerClose
} from 'ui/drawer';
import { Button } from 'ui/button';
import { X, ChevronDown, ChevronUp, HammerIcon } from 'lucide-react';
import { extractMCPToolId } from 'lib/ai/mcp/mcp-tool-id';
import { cn } from 'lib/utils';
import { MIVAContentRenderer } from './MIVAContentRenderer';

interface ToolCallData {
  id: string;
  toolName: string;
  mcpServerName: string;
  mcpToolName?: string;
  result: any;
  timestamp: number;
  messageId: string;
}

interface ChatDrawerProps {
  messages: UIMessage[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatDrawer({ messages, open, onOpenChange }: ChatDrawerProps) {
  const [selectedToolCall, setSelectedToolCall] = useState<ToolCallData | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Extract MIVA tool calls from messages
  const toolCalls = useMemo(() => {
    const calls: ToolCallData[] = [];
    
    messages.forEach((message) => {
      message.parts.forEach((part) => {
        if (isToolUIPart(part) && part.state.startsWith('output')) {
          const toolName = getToolName(part);
          const { serverName: mcpServerName, toolName: mcpToolName } = extractMCPToolId(toolName);
          
          // Only include MIVA academic tool calls
          if (mcpServerName === 'miva-academic' && part.output) {
            calls.push({
              id: part.toolCallId,
              toolName,
              mcpServerName,
              mcpToolName,
              result: part.output,
              timestamp: Date.now(),
              messageId: message.id,
            });
          }
        }
      });
    });
    
    return calls.reverse(); // Most recent first
  }, [messages]);

  // Auto-select the most recent tool call if none selected
  useEffect(() => {
    if (toolCalls.length > 0 && !selectedToolCall) {
      setSelectedToolCall(toolCalls[0]);
    }
  }, [toolCalls, selectedToolCall]);

  // Clear selection when drawer closes
  useEffect(() => {
    if (!open) {
      setSelectedToolCall(null);
      setExpandedItem(null);
    }
  }, [open]);

  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="min-w-[480px] max-w-4xl w-[40vw] bg-card border-l">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HammerIcon className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Tool Results</span>
              <span className="text-xs text-muted-foreground">({toolCalls.length})</span>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {toolCalls.map((toolCall) => (
            <div key={toolCall.id} className="space-y-2">
              {/* Tool Call Item - matching tool call styling */}
              <div
                className={cn(
                  "min-w-0 w-full p-4 rounded-lg bg-card border text-xs transition-colors cursor-pointer",
                  expandedItem === toolCall.id ? "bg-secondary" : "hover:bg-secondary"
                )}
                onClick={() => setExpandedItem(expandedItem === toolCall.id ? null : toolCall.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <HammerIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium text-sm text-foreground">
                      {toolCall.mcpToolName || toolCall.toolName}
                    </span>
                  </div>
                  {expandedItem === toolCall.id ? (
                    <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {toolCall.mcpServerName}
                </div>
              </div>

              {/* Expanded Content */}
              {expandedItem === toolCall.id && (
                <div className="pl-4 border-l border-border">
                  <div className="p-4 rounded-lg bg-card border">
                    <MIVAContentRenderer
                      toolName={toolCall.mcpToolName || toolCall.toolName}
                      result={toolCall.result}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          {toolCalls.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No tool calls yet</p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// Export both for backward compatibility
export const ChatSidebar = ChatDrawer;