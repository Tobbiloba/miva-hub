import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import {
  MAX_IMAGES_PER_MESSAGE,
  MODEL_IMAGE_WINDOW,
  attachmentUrl,
  chatImageKey,
  isOwnChatKey,
  keyFromAttachmentUrl,
  prepareImagesForModel,
  sanitizeIncomingParts,
  sniffImageType,
} from "./attachments";

const ada = "4b8c1f6e-0a3d-4c4e-9a1b-2f3e4d5c6b7a";
const eve = "9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b";
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);

const image = (key: string) =>
  ({ type: "file", mediaType: "image/jpeg", url: attachmentUrl(key) }) as const;
const text = (t: string) => ({ type: "text", text: t }) as const;
const msg = (id: string, parts: any[]): UIMessage => ({
  id,
  role: "user",
  parts,
});

describe("keys", () => {
  it("scopes keys to the user and rejects anything else", () => {
    const key = chatImageKey(ada, "image/jpeg");
    expect(isOwnChatKey(key, ada)).toBe(true);
    expect(isOwnChatKey(key, eve)).toBe(false);
    expect(isOwnChatKey(`chat-uploads/${ada}/../secret.jpg`, ada)).toBe(false);
    expect(isOwnChatKey(`submissions/${ada}/x.jpg`, ada)).toBe(false);
  });

  it("only reads keys from our own attachment route", () => {
    const key = chatImageKey(ada, "image/png");
    expect(keyFromAttachmentUrl(attachmentUrl(key))).toBe(key);
    expect(keyFromAttachmentUrl(`https://evil.example/${key}`)).toBeNull();
    expect(keyFromAttachmentUrl("data:image/png;base64,AAAA")).toBeNull();
  });
});

describe("sniffImageType", () => {
  it("trusts magic bytes, not names", () => {
    expect(sniffImageType(JPEG)).toBe("image/jpeg");
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(new TextEncoder().encode("RIFF0000WEBPVP8 "))).toBe(
      "image/webp",
    );
    expect(
      sniffImageType(new TextEncoder().encode("<svg onload=x>")),
    ).toBeNull();
  });
});

describe("sanitizeIncomingParts", () => {
  it("drops foreign, external and inline files and caps the count", () => {
    const own = Array.from({ length: MAX_IMAGES_PER_MESSAGE + 1 }, () =>
      image(chatImageKey(ada, "image/jpeg")),
    );
    const parts = sanitizeIncomingParts(
      [
        text("solve this"),
        image(chatImageKey(eve, "image/jpeg")),
        {
          type: "file",
          mediaType: "image/png",
          url: "https://x.example/a.png",
        },
        {
          type: "file",
          mediaType: "image/png",
          url: "data:image/png;base64,AA",
        },
        ...own,
      ] as any,
      ada,
    );
    expect(parts.filter((p) => p.type === "file")).toHaveLength(
      MAX_IMAGES_PER_MESSAGE,
    );
    expect(parts[0]).toEqual(text("solve this"));
  });
});

describe("prepareImagesForModel", () => {
  it("inlines the newest images, notes older ones, never mutates", async () => {
    const keys = Array.from({ length: MODEL_IMAGE_WINDOW + 1 }, () =>
      chatImageKey(ada, "image/jpeg"),
    );
    const messages = keys.map((k, i) =>
      msg(`m${i}`, [image(k), text(`q${i}`)]),
    );
    const loaded: string[] = [];
    const out = await prepareImagesForModel(messages, ada, async (key) => {
      loaded.push(key);
      return JPEG;
    });

    expect(loaded).toHaveLength(MODEL_IMAGE_WINDOW);
    expect(loaded).not.toContain(keys[0]);
    expect(out[0].parts[0]).toEqual(
      text("[An earlier photo was attached here.]"),
    );
    const last = out.at(-1)!.parts[0] as { url: string };
    expect(last.url.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect((messages.at(-1)!.parts[0] as { url: string }).url).toBe(
      attachmentUrl(keys.at(-1)!),
    );
  });

  it("drops other users' images and survives a failed load", async () => {
    const mine = chatImageKey(ada, "image/jpeg");
    const out = await prepareImagesForModel(
      [
        msg("a", [
          image(chatImageKey(eve, "image/jpeg")),
          image(mine),
          text("hi"),
        ]),
      ],
      ada,
      async () => {
        throw new Error("gone");
      },
    );
    expect(out[0].parts).toEqual([
      text("[A photo was attached here but could not be loaded.]"),
      text("hi"),
    ]);
  });
});
