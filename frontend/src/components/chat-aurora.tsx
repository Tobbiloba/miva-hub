/* Ambient backdrop for the chat screen. Pure CSS (see globals.css): drifting
 * violet/teal light fields, a whispered hairline grid, and film grain — gives
 * the liquid-glass composer something real to refract. */
export function ChatAurora() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div className="aurora-blob aurora-1" />
      <div className="aurora-blob aurora-2" />
      <div className="aurora-blob aurora-3" />
      <div className="aurora-grid" />
      <div className="aurora-grain" />
      {/* settle the edges back toward the page ground so content stays legible */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/70" />
    </div>
  );
}
