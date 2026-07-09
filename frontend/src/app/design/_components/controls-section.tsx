"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import {
  Bold,
  Italic,
  Loader2,
  Mail,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Section, Specimen, SubSection } from "./design-shell";

const BUTTON_VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "link",
  "destructive",
] as const;

export function ControlsSection() {
  return (
    <Section
      id="controls"
      title="Controls"
      description="Buttons, badges, and every form primitive — in all variants, sizes, and states."
    >
      <SubSection title="Buttons — variants">
        <Specimen label='variant="default | secondary | outline | ghost | link | destructive"'>
          {BUTTON_VARIANTS.map((v) => (
            <Button key={v} variant={v}>
              {v}
            </Button>
          ))}
        </Specimen>
      </SubSection>

      <SubSection title="Buttons — sizes & states">
        <div className="grid gap-6 lg:grid-cols-2">
          <Specimen label='size="sm | default | lg | icon"'>
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Add">
              <Plus />
            </Button>
          </Specimen>
          <Specimen label="disabled · loading · with icon · destructive icon">
            <Button disabled>Disabled</Button>
            <Button disabled>
              <Loader2 className="animate-spin" />
              Saving…
            </Button>
            <Button variant="outline">
              <Mail />
              With icon
            </Button>
            <Button variant="destructive" size="icon" aria-label="Delete">
              <Trash2 />
            </Button>
          </Specimen>
        </div>
      </SubSection>

      <SubSection title="Badges">
        <Specimen label='variant="default | secondary | destructive | outline"'>
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </Specimen>
      </SubSection>

      <SubSection title="Text inputs">
        <div className="grid gap-6 lg:grid-cols-2">
          <Specimen label="default · with value · disabled · invalid (aria-invalid)">
            <div className="w-full space-y-3">
              <Input placeholder="Placeholder text…" />
              <Input defaultValue="Filled value" />
              <Input disabled placeholder="Disabled" />
              <Input
                aria-invalid
                defaultValue="Invalid entry"
                aria-label="Invalid example"
              />
            </div>
          </Specimen>
          <Specimen label="password · file · search-with-icon · textarea">
            <div className="w-full space-y-3">
              <Input type="password" defaultValue="hunter2secret" />
              <Input type="file" aria-label="Upload file" />
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-8" placeholder="Search…" />
              </div>
              <Textarea placeholder="Multi-line textarea…" rows={3} />
            </div>
          </Specimen>
        </div>
      </SubSection>

      <SubSection title="Selection controls">
        <div className="grid gap-6 lg:grid-cols-2">
          <Specimen label="Select · Label pairing">
            <div className="w-full space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="ds-select">Academic year</Label>
                <Select defaultValue="200">
                  <SelectTrigger id="ds-select" className="w-full">
                    <SelectValue placeholder="Choose a year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">100 level</SelectItem>
                    <SelectItem value="200">200 level</SelectItem>
                    <SelectItem value="300">300 level</SelectItem>
                    <SelectItem value="400">400 level</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ds-select-disabled">Disabled select</Label>
                <Select disabled>
                  <SelectTrigger id="ds-select-disabled" className="w-full">
                    <SelectValue placeholder="Unavailable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="x">—</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Specimen>
          <Specimen label="Checkbox · Radio group · Switch · Toggle">
            <div className="w-full space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox defaultChecked /> Checked
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox /> Unchecked
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox disabled /> Disabled
                </label>
              </div>
              <RadioGroup defaultValue="a" className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="a" /> Option A
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="b" /> Option B
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RadioGroupItem value="c" disabled /> Disabled
                </label>
              </RadioGroup>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Switch defaultChecked /> On
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch /> Off
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Switch disabled /> Disabled
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Toggle aria-label="Toggle bold" defaultPressed>
                  <Bold />
                </Toggle>
                <Toggle aria-label="Toggle italic" variant="outline">
                  <Italic />
                </Toggle>
                <Toggle aria-label="Toggle disabled" disabled>
                  Off
                </Toggle>
              </div>
            </div>
          </Specimen>
        </div>
      </SubSection>
    </Section>
  );
}
