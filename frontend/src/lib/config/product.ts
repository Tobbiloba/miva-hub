/**
 * Product-shape flags.
 *
 * CHAT_FIRST hides the university-management (SIS) surface so Askly reads as one
 * grounded chat — "ChatGPT for students." Nothing is deleted: the routes still
 * exist, they're just not linked. Reversible at runtime by setting
 * NEXT_PUBLIC_CHAT_FIRST=false to restore the full-platform navigation.
 *
 * Default: chat-first ON.
 */
export const CHAT_FIRST = process.env.NEXT_PUBLIC_CHAT_FIRST !== "false";
