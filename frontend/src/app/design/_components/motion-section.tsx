"use client";

import { CodeBlock } from "@/components/ui/CodeBlock";
import { AsanaIcon } from "@/components/ui/asana-icon";
import { AtlassianIcon } from "@/components/ui/atlassian-icon";
import { CanvaIcon } from "@/components/ui/canva-icon";
import { ClaudeIcon } from "@/components/ui/claude-icon";
import { CountAnimation } from "@/components/ui/count-animation";
import DecryptedText from "@/components/ui/decrypted-text";
import { DiscordIcon } from "@/components/ui/discord-icon";
import { FlipWords } from "@/components/ui/flip-words";
import { GeminiIcon } from "@/components/ui/gemini-icon";
import { GithubIcon } from "@/components/ui/github-icon";
import { GlobalIcon } from "@/components/ui/global-icon";
import { GoogleIcon } from "@/components/ui/google-icon";
import { GrokIcon } from "@/components/ui/grok-icon";
import JsonView from "@/components/ui/json-view";
import LightRays from "@/components/ui/light-rays";
import { LinearIcon } from "@/components/ui/linear-icon";
import { MCPIcon } from "@/components/ui/mcp-icon";
import { MessageLoading } from "@/components/ui/message-loading";
import { MicrosoftIcon } from "@/components/ui/microsoft-icon";
import { NeonIcon } from "@/components/ui/neon-icon";
import { NotionIcon } from "@/components/ui/notion-icon";
import { OllamaIcon } from "@/components/ui/ollama-icon";
import { OpenRouterIcon } from "@/components/ui/open-router-icon";
import { OpenAIIcon } from "@/components/ui/openai-icon";
import Particles from "@/components/ui/particles";
import { PaypalIcon } from "@/components/ui/paypal-icon";
import { PlaywrightIcon } from "@/components/ui/playwright-icon";
import { StripeIcon } from "@/components/ui/stripe-icon";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { Think } from "@/components/ui/think";
import { WriteIcon } from "@/components/ui/write-icon";
import { Section, Specimen, SubSection } from "./design-shell";

const SAMPLE_CODE = `export async function grade(submission: Submission) {
  const result = await ai.generateObject({
    model: "google/gemini-2.5-flash",
    schema: gradeSchema,
    prompt: buildRubricPrompt(submission),
  });
  return result.object;
}`;

const SAMPLE_JSON = {
  decision: "auto_post",
  confidence: 0.91,
  suggestedGrade: 8.5,
  breakdown: [
    { criterion: "Correctness", score: 4.5, max: 5 },
    { criterion: "Style", score: 4, max: 5 },
  ],
};

const BRAND_ICONS = [
  { name: "Gemini", Icon: GeminiIcon },
  { name: "OpenAI", Icon: OpenAIIcon },
  { name: "Claude", Icon: ClaudeIcon },
  { name: "Grok", Icon: GrokIcon },
  { name: "Ollama", Icon: OllamaIcon },
  { name: "OpenRouter", Icon: OpenRouterIcon },
  { name: "Google", Icon: GoogleIcon },
  { name: "Microsoft", Icon: MicrosoftIcon },
  { name: "GitHub", Icon: GithubIcon },
  { name: "Notion", Icon: NotionIcon },
  { name: "Linear", Icon: LinearIcon },
  { name: "Asana", Icon: AsanaIcon },
  { name: "Atlassian", Icon: AtlassianIcon },
  { name: "Canva", Icon: CanvaIcon },
  { name: "Discord", Icon: DiscordIcon },
  { name: "Stripe", Icon: StripeIcon },
  { name: "PayPal", Icon: PaypalIcon },
  { name: "Neon", Icon: NeonIcon },
  { name: "Playwright", Icon: PlaywrightIcon },
  { name: "MCP", Icon: MCPIcon },
  { name: "Global", Icon: GlobalIcon },
  { name: "Write", Icon: WriteIcon },
];

export function MotionSection() {
  return (
    <Section
      id="motion"
      title="Motion, Visual Tools & Icons"
      description="Text effects, loaders, ambient backgrounds, code rendering, and the brand icon set."
    >
      <SubSection title="Text effects">
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <Specimen label="TextShimmer · FlipWords">
            <div className="w-full space-y-3 text-lg">
              <TextShimmer>Thinking through your submission…</TextShimmer>
              <div>
                Learn{" "}
                <FlipWords
                  words={["faster", "deeper", "anywhere", "together"]}
                  className="font-medium text-primary"
                />
              </div>
            </div>
          </Specimen>
          <Specimen label="DecryptedText · CountAnimation">
            <div className="w-full space-y-3 text-lg">
              <DecryptedText
                text="AI-graded. Human-verified."
                animateOn="view"
                sequential
              />
              <p>
                <CountAnimation number={4200} className="font-bold" />+
                submissions graded
              </p>
            </div>
          </Specimen>
        </div>
      </SubSection>

      <SubSection title="Loaders">
        <Specimen label="MessageLoading (chat typing) · Think (pulse)">
          <MessageLoading className="text-muted-foreground" />
          <Think />
        </Specimen>
      </SubSection>

      <SubSection title="Ambient backgrounds">
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <div className="relative h-40 overflow-hidden rounded-lg border bg-black">
              <Particles
                className="absolute inset-0"
                particleCount={150}
                particleBaseSize={60}
                moveParticlesOnHover
              />
              <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
                Particles
              </p>
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              Particles — WebGL, hero sections
            </p>
          </div>
          <div className="min-w-0 space-y-2">
            <div className="relative h-40 overflow-hidden rounded-lg border bg-black">
              <LightRays className="absolute inset-0" raysSpeed={1.2} />
              <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
                LightRays
              </p>
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              LightRays — shader glow, landing surfaces
            </p>
          </div>
        </div>
      </SubSection>

      <SubSection title="Code & structured data">
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <div className="min-w-0 overflow-x-auto rounded-lg border">
              <CodeBlock code={SAMPLE_CODE} lang="typescript" />
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              CodeBlock — shiki highlighting, theme-aware
            </p>
          </div>
          <div className="min-w-0 space-y-2">
            <div className="min-w-0 overflow-x-auto rounded-lg border bg-card p-4">
              <JsonView data={SAMPLE_JSON} initialExpandDepth={2} />
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              JsonView — collapsible tree for tool payloads
            </p>
          </div>
        </div>
      </SubSection>

      <SubSection title="Brand icon set">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {BRAND_ICONS.map(({ name, Icon }) => (
            <div
              key={name}
              className="flex flex-col items-center gap-2 rounded-lg border bg-card p-3"
            >
              <Icon className="size-6" />
              <span className="text-[10px] text-muted-foreground">{name}</span>
            </div>
          ))}
        </div>
      </SubSection>
    </Section>
  );
}
