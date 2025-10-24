"use client";

import { useState, useMemo } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "ui/drawer";
import { Input } from "ui/input";
import { Button } from "ui/button";
import { Badge } from "ui/badge";
import {
  TOOLS_INFO_DATA,
  ToolCategory,
  CATEGORY_DISPLAY_NAMES,
  TOOL_CATEGORIES,
  searchTools,
  getToolsByCategory,
  type ToolInfo,
} from "@/lib/tools-info";
import { X, Search, Play } from "lucide-react";
import clsx from "clsx";

interface ToolsInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ToolsInfoDrawer({ isOpen, onClose }: ToolsInfoDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    ToolCategory | "all"
  >("all");

  // Filter tools based on search and category
  const filteredTools = useMemo(() => {
    let results: ToolInfo[] = [];

    if (searchQuery.trim()) {
      results = searchTools(searchQuery);
    } else {
      results = TOOLS_INFO_DATA;
    }

    if (selectedCategory !== "all") {
      results = results.filter((tool) => tool.category === selectedCategory);
    }

    return results;
  }, [searchQuery, selectedCategory]);

  const groupedTools = useMemo(() => {
    const groups: Record<ToolCategory, ToolInfo[]> = {
      [ToolCategory.Visualization]: [],
      [ToolCategory.WebSearch]: [],
      [ToolCategory.CodeExecution]: [],
      [ToolCategory.Academic]: [],
      [ToolCategory.Http]: [],
    };

    filteredTools.forEach((tool) => {
      groups[tool.category].push(tool);
    });

    return groups;
  }, [filteredTools]);

  const handleClose = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    onClose();
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleClose}>
      <DrawerContent className="h-[90vh] max-h-[90vh] flex flex-col">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DrawerTitle className="text-2xl">Available Tools</DrawerTitle>
              <DrawerDescription>
                Explore all available tools and watch demo videos to learn how
                to use them
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Search Bar */}
          <div className="border-b p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
              >
                All ({TOOLS_INFO_DATA.length})
              </Button>
              {TOOL_CATEGORIES.map((category) => {
                const count = getToolsByCategory(category).length;
                return (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {CATEGORY_DISPLAY_NAMES[category]} ({count})
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Tools Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredTools.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">
                  No tools found. Try adjusting your search or filters.
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {TOOL_CATEGORIES.map((category) => {
                  const toolsInCategory = groupedTools[category];
                  if (toolsInCategory.length === 0) return null;

                  return (
                    <div key={category} className="space-y-3">
                      <h3 className="text-lg font-semibold text-foreground">
                        {CATEGORY_DISPLAY_NAMES[category]}
                      </h3>
                      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {toolsInCategory.map((tool) => (
                          <ToolCard key={tool.id} tool={tool} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

interface ToolCardProps {
  tool: ToolInfo;
}

function ToolCard({ tool }: ToolCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={clsx(
        "relative p-4 rounded-lg border transition-all duration-200",
        "bg-card hover:bg-accent/50 hover:border-accent",
        "hover:shadow-md cursor-pointer",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tool Header */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">{tool.icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{tool.displayName}</h4>
          <Badge variant="secondary" className="mt-1 text-xs">
            {tool.name}
          </Badge>
        </div>
      </div>

      {/* Tool Description */}
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
        {tool.description}
      </p>

      {/* Tool Usage */}
      <p className="text-xs text-foreground/70 mb-3">
        <span className="font-medium">How to use:</span> {tool.usage}
      </p>

      {/* Keywords */}
      <div className="flex flex-wrap gap-1 mb-3">
        {tool.keywords.slice(0, 3).map((keyword) => (
          <Badge key={keyword} variant="outline" className="text-xs">
            {keyword}
          </Badge>
        ))}
        {tool.keywords.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{tool.keywords.length - 3}
          </Badge>
        )}
      </div>

      {/* Video Demo Section */}
      {tool.demoVideoUrl ? (
        <div
          className={clsx(
            "mt-3 pt-3 border-t",
            isHovered ? "opacity-100" : "opacity-75",
          )}
        >
          <a
            href={tool.demoVideoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
          >
            <Play className="h-3 w-3" />
            Watch Demo
          </a>
        </div>
      ) : (
        <div
          className={clsx(
            "mt-3 pt-3 border-t",
            isHovered ? "opacity-100" : "opacity-75",
          )}
        >
          <p className="text-xs text-muted-foreground">📹 Demo video coming soon</p>
        </div>
      )}
    </div>
  );
}
