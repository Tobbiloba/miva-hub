"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, Info, TerminalSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { toast } from "sonner";
import { Section, Specimen, SubSection } from "./design-shell";

const chartData = [
  { week: "W1", score: 62 },
  { week: "W2", score: 71 },
  { week: "W3", score: 68 },
  { week: "W4", score: 79 },
  { week: "W5", score: 85 },
  { week: "W6", score: 91 },
];

const chartConfig = {
  score: { label: "Score", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function SurfacesSection() {
  const [progress, setProgress] = useState(15);
  useEffect(() => {
    const t = setInterval(
      () => setProgress((p) => (p >= 100 ? 15 : p + 17)),
      1500,
    );
    return () => clearInterval(t);
  }, []);

  return (
    <Section
      id="surfaces"
      title="Surfaces & Overlays"
      description="Containers, feedback, overlays, navigation, and data display — all live and interactive."
    >
      <SubSection title="Card & Alerts">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Card title</CardTitle>
              <CardDescription>
                Header, content, and footer slots with consistent padding.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Cards are the primary container for grouped content — dashboards,
              forms, and detail panels all compose from this surface.
            </CardContent>
            <CardFooter className="gap-2">
              <Button size="sm">Action</Button>
              <Button size="sm" variant="ghost">
                Cancel
              </Button>
            </CardFooter>
          </Card>
          <div className="space-y-3">
            <Alert>
              <Info className="size-4" />
              <AlertTitle>Default alert</AlertTitle>
              <AlertDescription>
                Neutral, informational messaging on the card surface.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Destructive alert</AlertTitle>
              <AlertDescription>
                Something failed — the copy explains what and how to recover.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </SubSection>

      <SubSection title="Modal overlays">
        <Specimen label="Dialog · AlertDialog · Sheet · Drawer">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog</DialogTitle>
                <DialogDescription>
                  Centered modal for focused tasks and confirmations.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button>Confirm</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Alert Dialog</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  Destructive confirmations always use this pattern — never a
                  plain dialog.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Open Sheet</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Sheet</SheetTitle>
                <SheetDescription>
                  Side panel for secondary flows — filters, detail views,
                  settings.
                </SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>

          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline">Open Drawer</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Drawer</DrawerTitle>
                <DrawerDescription>
                  Bottom drawer — the mobile-first overlay surface.
                </DrawerDescription>
              </DrawerHeader>
              <div className="p-4 pb-8">
                <Button className="w-full">Primary action</Button>
              </div>
            </DrawerContent>
          </Drawer>
        </Specimen>
      </SubSection>

      <SubSection title="Floating overlays">
        <Specimen label="DropdownMenu · Popover · HoverCard · Tooltip">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Dropdown</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>My account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem variant="destructive">
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Popover</Button>
            </PopoverTrigger>
            <PopoverContent className="text-sm">
              Anchored, non-modal surface for pickers and inline forms.
            </PopoverContent>
          </Popover>

          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="link">Hover card</Button>
            </HoverCardTrigger>
            <HoverCardContent className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>NE</AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <p className="font-medium">Ngozi Eze</p>
                <p className="text-muted-foreground">200-level, CS</p>
              </div>
            </HoverCardContent>
          </HoverCard>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Terminal">
                <TerminalSquare />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tooltip content</TooltipContent>
          </Tooltip>
        </Specimen>
      </SubSection>

      <SubSection title="Navigation">
        <div className="grid gap-6 lg:grid-cols-2">
          <Specimen label="Tabs · Breadcrumb">
            <div className="w-full space-y-4">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="grades">Grades</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                <TabsContent
                  value="overview"
                  className="text-sm text-muted-foreground"
                >
                  Tab panels swap content without navigation.
                </TabsContent>
                <TabsContent
                  value="grades"
                  className="text-sm text-muted-foreground"
                >
                  Grades panel.
                </TabsContent>
                <TabsContent
                  value="settings"
                  className="text-sm text-muted-foreground"
                >
                  Settings panel.
                </TabsContent>
              </Tabs>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#surfaces">Home</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#surfaces">Courses</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>COS201</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </Specimen>
          <Specimen label="Command palette · Accordion">
            <div className="w-full space-y-4">
              <Command className="rounded-lg border">
                <CommandInput placeholder="Type a command…" />
                <CommandList className="max-h-32">
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup heading="Suggestions">
                    <CommandItem>Open course</CommandItem>
                    <CommandItem>Grade submissions</CommandItem>
                    <CommandItem>New announcement</CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="a">
                  <AccordionTrigger>Accordion item one</AccordionTrigger>
                  <AccordionContent>
                    Progressive disclosure for dense content.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="b">
                  <AccordionTrigger>Accordion item two</AccordionTrigger>
                  <AccordionContent>
                    Each item expands independently.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </Specimen>
        </div>
      </SubSection>

      <SubSection title="Data display">
        <div className="grid gap-6 lg:grid-cols-2">
          <Specimen label="Table · Avatar · Badge status pattern">
            <div className="w-full space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>GPA</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarFallback className="text-[10px]">
                          AO
                        </AvatarFallback>
                      </Avatar>
                      Ada Okonkwo
                    </TableCell>
                    <TableCell>4.63</TableCell>
                    <TableCell>
                      <Badge variant="secondary">active</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarImage src="/logo.png" alt="" />
                        <AvatarFallback className="text-[10px]">
                          CO
                        </AvatarFallback>
                      </Avatar>
                      Chidi Okeke
                    </TableCell>
                    <TableCell>4.22</TableCell>
                    <TableCell>
                      <Badge variant="outline">graduated</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </Specimen>
          <Specimen label="Chart (recharts + ChartContainer, chart-1 token)">
            <ChartContainer config={chartConfig} className="h-48 w-full">
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="week"
                  tickLine={false}
                  tickMargin={8}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="score"
                  fill="var(--color-score)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </Specimen>
        </div>
      </SubSection>

      <SubSection title="Progress, loading & feedback">
        <div className="grid gap-6 lg:grid-cols-2">
          <Specimen label="Progress (animated) · Skeleton · Separator · ScrollArea">
            <div className="w-full space-y-4">
              <Progress value={progress} aria-label="Demo progress" />
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span>Left</span>
                <Separator orientation="vertical" className="h-4" />
                <span>Right</span>
              </div>
              <Separator />
              <ScrollArea className="h-20 rounded-md border p-3 text-sm text-muted-foreground">
                <p>
                  ScrollArea clips long content with a styled scrollbar. Lorem
                  ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                  eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                  enim ad minim veniam, quis nostrud exercitation ullamco
                  laboris nisi ut aliquip ex ea commodo consequat.
                </p>
              </ScrollArea>
            </div>
          </Specimen>
          <Specimen label="Sonner toasts — success · error · info · promise">
            <Button
              variant="outline"
              onClick={() => toast.success("Grade approved and applied")}
            >
              Success
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.error("Failed to save changes")}
            >
              Error
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.info("3 submissions awaiting review")}
            >
              Info
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast.promise(new Promise((r) => setTimeout(r, 1500)), {
                  loading: "Grading…",
                  success: "Graded 12 submissions",
                  error: "Grading failed",
                })
              }
            >
              Promise
            </Button>
          </Specimen>
        </div>
      </SubSection>
    </Section>
  );
}
