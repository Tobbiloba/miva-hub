import type { UIMessage } from "ai";

/**
 * Snap-to-Solve: photos attached to chat messages.
 *
 * The browser shrinks a photo and posts it to /api/chat/attachments, which
 * checks the bytes, stores them in S3 under the student's own prefix and
 * returns an app URL (/api/chat/attachments/<key>). That URL is what the
 * message part keeps, so thumbnails render through an ownership-checked
 * route and the image is never stored inline in chat_message.parts.
 * Just before the model call the server swaps the URL for the bytes.
 */

export const CHAT_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
export type ChatImageType = keyof typeof CHAT_IMAGE_TYPES;

/** Under the 4.5 MB serverless body limit; the browser sends ~0.3–1 MB. */
export const MAX_CHAT_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_IMAGES_PER_MESSAGE = 3;
/** Only the most recent images go to the model; older ones become a note. */
export const MODEL_IMAGE_WINDOW = 4;

/** Window event that asks the chat composer to open its photo picker. */
export const OPEN_PHOTO_PICKER_EVENT = "askly:open-photo-picker";

const ROUTE = "/api/chat/attachments/";
const KEY_RE =
  /^chat-uploads\/([A-Za-z0-9-]{1,64})\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

export function chatImageKey(userId: string, type: ChatImageType): string {
  return `chat-uploads/${userId}/${crypto.randomUUID()}.${CHAT_IMAGE_TYPES[type]}`;
}

export function attachmentUrl(key: string): string {
  return ROUTE + key;
}

/** The S3 key behind an attachment URL, or null if it isn't one of ours. */
export function keyFromAttachmentUrl(url: string): string | null {
  if (!url.startsWith(ROUTE)) return null;
  const key = url.slice(ROUTE.length);
  return KEY_RE.test(key) ? key : null;
}

/** True only for a well-formed chat upload key under this user's prefix. */
export function isOwnChatKey(key: string, userId: string): boolean {
  const match = KEY_RE.exec(key);
  return !!match && match[1] === userId;
}

/** Media type from the file's magic bytes; the client's claim is not trusted. */
export function sniffImageType(bytes: Uint8Array): ChatImageType | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return "image/jpeg";
  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (b, i) => bytes[i] === b,
    )
  )
    return "image/png";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}

type Part = UIMessage["parts"][number];
type FilePart = Extract<Part, { type: "file" }>;

function ownImageKey(part: Part, userId: string): string | null {
  if (part.type !== "file") return null;
  const key = keyFromAttachmentUrl((part as FilePart).url ?? "");
  return key && isOwnChatKey(key, userId) ? key : null;
}

/**
 * The parts of an incoming user message that may be kept: everything except
 * file parts that aren't this student's own uploads (an external URL or a
 * data URL would otherwise reach the model provider and be saved), capped at
 * MAX_IMAGES_PER_MESSAGE images.
 */
export function sanitizeIncomingParts(parts: Part[], userId: string): Part[] {
  let images = 0;
  return parts.filter((part) => {
    if (part.type !== "file") return true;
    if (!ownImageKey(part, userId)) return false;
    images += 1;
    return images <= MAX_IMAGES_PER_MESSAGE;
  });
}

/**
 * Copies of `messages` ready for the model: the newest MODEL_IMAGE_WINDOW own
 * images become data URLs (bytes from `loadBytes`), older ones a short text
 * note, and any other file part is dropped. Never mutates the input, so the
 * stored message keeps its app URLs.
 */
export async function prepareImagesForModel(
  messages: UIMessage[],
  userId: string,
  loadBytes: (key: string) => Promise<Uint8Array>,
): Promise<UIMessage[]> {
  const recent = new Set<string>();
  for (
    let m = messages.length - 1;
    m >= 0 && recent.size < MODEL_IMAGE_WINDOW;
    m--
  ) {
    const parts = messages[m].parts;
    for (
      let p = parts.length - 1;
      p >= 0 && recent.size < MODEL_IMAGE_WINDOW;
      p--
    ) {
      const key = ownImageKey(parts[p], userId);
      if (key) recent.add(key);
    }
  }

  const dataUrls = new Map<string, string | null>();
  await Promise.all(
    [...recent].map(async (key) => {
      try {
        const bytes = await loadBytes(key);
        const type = sniffImageType(bytes);
        dataUrls.set(
          key,
          type
            ? `data:${type};base64,${Buffer.from(bytes).toString("base64")}`
            : null,
        );
      } catch {
        dataUrls.set(key, null);
      }
    }),
  );

  return messages.map((message) => {
    if (!message.parts.some((p) => p.type === "file")) return message;
    const parts: Part[] = [];
    for (const part of message.parts) {
      if (part.type !== "file") {
        parts.push(part);
        continue;
      }
      const key = ownImageKey(part, userId);
      if (!key) continue;
      const data = dataUrls.get(key);
      if (data) {
        parts.push({ ...(part as FilePart), url: data });
      } else {
        parts.push({
          type: "text",
          text: recent.has(key)
            ? "[A photo was attached here but could not be loaded.]"
            : "[An earlier photo was attached here.]",
        });
      }
    }
    return { ...message, parts };
  });
}

/**
 * The same message with its photos replaced by `note`, for when a photo must
 * not reach the model (a live, graded quiz). Never mutates the input.
 */
export function withholdPhotos(message: UIMessage, note: string): UIMessage {
  const parts = message.parts.filter((p) => p.type !== "file");
  return { ...message, parts: [{ type: "text", text: note }, ...parts] };
}
