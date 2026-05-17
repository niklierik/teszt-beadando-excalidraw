import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import { MIME_TYPES, IMAGE_MIME_TYPES } from "@excalidraw/common";

import type { DataURL } from "../../types";

import {
  getMimeType,
  getFileHandleType,
  isImageFileHandleType,
  isImageFileHandle,
  isSupportedImageFile,
  isSupportedImageFileType,
  canvasToBlob,
  getDataURL,
  getDataURL_sync,
  dataURLToFile,
  dataURLToString,
  SVGStringToFile,
  createFile,
  blobToArrayBuffer,
  generateIdFromFile,
  normalizeFile,
} from "../../data/blob";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal File with the given name and type. */
const makeFile = (name: string, type: string, content = "data") =>
  new File([content], name, { type });

/** Build a minimal Blob with the given type. */
const makeBlob = (type: string, content = "data") =>
  new Blob([content], { type });

// ---------------------------------------------------------------------------
// getMimeType
// ---------------------------------------------------------------------------

describe("getMimeType", () => {
  it("returns the blob.type when the blob has a type set", () => {
    const blob = makeBlob(MIME_TYPES.png);
    expect(getMimeType(blob)).toBe(MIME_TYPES.png);
  });

  it("falls back to name-based detection when blob.type is empty", () => {
    const blob = makeBlob("", "");
    Object.defineProperty(blob, "name", { value: "drawing.excalidraw" });
    expect(getMimeType(blob)).toBe(MIME_TYPES.json);
  });

  it("detects .excalidraw extension from string", () => {
    expect(getMimeType("scene.excalidraw")).toBe(MIME_TYPES.json);
  });

  it("detects .json extension from string", () => {
    expect(getMimeType("data.json")).toBe(MIME_TYPES.json);
  });

  it("detects .png extension from string", () => {
    expect(getMimeType("image.png")).toBe(MIME_TYPES.png);
  });

  it("detects .jpg extension from string", () => {
    expect(getMimeType("photo.jpg")).toBe(MIME_TYPES.jpg);
  });

  it("detects .jpeg extension from string", () => {
    expect(getMimeType("photo.jpeg")).toBe(MIME_TYPES.jpg);
  });

  it("detects .svg extension from string", () => {
    expect(getMimeType("vector.svg")).toBe(MIME_TYPES.svg);
  });

  it("detects .excalidrawlib extension from string", () => {
    expect(getMimeType("lib.excalidrawlib")).toBe(MIME_TYPES.excalidrawlib);
  });

  it("returns empty string for unknown extension", () => {
    expect(getMimeType("file.unknown")).toBe("");
  });

  it("returns empty string for a string with no extension", () => {
    expect(getMimeType("noextension")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// getFileHandleType
// ---------------------------------------------------------------------------

describe("getFileHandleType", () => {
  const makeHandle = (name: string) =>
    ({ name } as unknown as FileSystemFileHandle);

  it("returns null for a null handle", () => {
    expect(getFileHandleType(null)).toBeNull();
  });

  it("returns 'json' for a .json handle", () => {
    expect(getFileHandleType(makeHandle("scene.json"))).toBe("json");
  });

  it("returns 'excalidraw' for a .excalidraw handle", () => {
    expect(getFileHandleType(makeHandle("scene.excalidraw"))).toBe(
      "excalidraw",
    );
  });

  it("returns 'png' for a .png handle", () => {
    expect(getFileHandleType(makeHandle("image.png"))).toBe("png");
  });

  it("returns 'svg' for a .svg handle", () => {
    expect(getFileHandleType(makeHandle("vector.svg"))).toBe("svg");
  });

  it("returns null for an unrecognised extension", () => {
    expect(getFileHandleType(makeHandle("file.txt"))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isImageFileHandleType
// ---------------------------------------------------------------------------

describe("isImageFileHandleType", () => {
  it("returns true for 'png'", () => {
    expect(isImageFileHandleType("png")).toBe(true);
  });

  it("returns true for 'svg'", () => {
    expect(isImageFileHandleType("svg")).toBe(true);
  });

  it("returns false for 'json'", () => {
    expect(isImageFileHandleType("json")).toBe(false);
  });

  it("returns false for 'excalidraw'", () => {
    expect(isImageFileHandleType("excalidraw")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isImageFileHandleType(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isImageFileHandle
// ---------------------------------------------------------------------------

describe("isImageFileHandle", () => {
  const makeHandle = (name: string) =>
    ({ name } as unknown as FileSystemFileHandle);

  it("returns true for a .png handle", () => {
    expect(isImageFileHandle(makeHandle("image.png"))).toBe(true);
  });

  it("returns true for a .svg handle", () => {
    expect(isImageFileHandle(makeHandle("vector.svg"))).toBe(true);
  });

  it("returns false for a .json handle", () => {
    expect(isImageFileHandle(makeHandle("scene.json"))).toBe(false);
  });

  it("returns false for null", () => {
    expect(isImageFileHandle(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isSupportedImageFileType
// ---------------------------------------------------------------------------

describe("isSupportedImageFileType", () => {
  it("returns true for all IMAGE_MIME_TYPES values", () => {
    for (const mimeType of Object.values(IMAGE_MIME_TYPES)) {
      expect(isSupportedImageFileType(mimeType)).toBe(true);
    }
  });

  it("returns false for application/json", () => {
    expect(isSupportedImageFileType(MIME_TYPES.json)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isSupportedImageFileType(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isSupportedImageFileType(undefined)).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isSupportedImageFileType("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isSupportedImageFile
// ---------------------------------------------------------------------------

describe("isSupportedImageFile", () => {
  it("returns true for a blob with an image mime type", () => {
    expect(isSupportedImageFile(makeBlob(MIME_TYPES.png))).toBe(true);
  });

  it("returns true for image/jpeg", () => {
    expect(isSupportedImageFile(makeBlob(MIME_TYPES.jpg))).toBe(true);
  });

  it("returns false for a blob with application/json type", () => {
    expect(isSupportedImageFile(makeBlob(MIME_TYPES.json))).toBe(false);
  });

  it("returns false for null", () => {
    expect(isSupportedImageFile(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isSupportedImageFile(undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createFile
// ---------------------------------------------------------------------------

describe("createFile", () => {
  it("creates a File with the given mimeType and name", () => {
    const file = createFile(new ArrayBuffer(4), MIME_TYPES.png, "test.png");
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe(MIME_TYPES.png);
    expect(file.name).toBe("test.png");
  });

  it("uses an empty string for name when undefined is passed", () => {
    const file = createFile(new ArrayBuffer(4), MIME_TYPES.png, undefined);
    expect(file.name).toBe("");
  });

  it("accepts a Blob as the source", () => {
    const blob = makeBlob(MIME_TYPES.png);
    const file = createFile(blob, MIME_TYPES.png, "from-blob.png");
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe(MIME_TYPES.png);
  });
});

// ---------------------------------------------------------------------------
// SVGStringToFile
// ---------------------------------------------------------------------------

describe("SVGStringToFile", () => {
  it("creates a File with svg mime type", () => {
    const file = SVGStringToFile("<svg></svg>", "icon.svg");
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe(MIME_TYPES.svg);
  });

  it("uses the provided filename", () => {
    const file = SVGStringToFile("<svg></svg>", "my-icon.svg");
    expect(file.name).toBe("my-icon.svg");
  });

  it("defaults to an empty filename when none is provided", () => {
    const file = SVGStringToFile("<svg></svg>");
    expect(file.name).toBe("");
  });

  it("encodes the SVG content correctly", async () => {
    const svgContent = "<svg><rect width='10' height='10'/></svg>";
    const file = SVGStringToFile(svgContent);
    // jsdom doesn't support File.text(), so decode via ArrayBuffer
    const buffer = await blobToArrayBuffer(file);
    const decoded = new TextDecoder().decode(buffer);
    expect(decoded).toBe(svgContent);
  });
});

// ---------------------------------------------------------------------------
// blobToArrayBuffer
// ---------------------------------------------------------------------------

describe("blobToArrayBuffer", () => {
  it("converts a Blob to an ArrayBuffer", async () => {
    const data = new Uint8Array([1, 2, 3, 4]);
    const blob = new Blob([data]);
    const buffer = await blobToArrayBuffer(blob);
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(buffer)).toEqual(data);
  });

  it("handles an empty Blob", async () => {
    const blob = new Blob([]);
    const buffer = await blobToArrayBuffer(blob);
    expect(buffer.byteLength).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getDataURL
// ---------------------------------------------------------------------------

describe("getDataURL", () => {
  it("returns a data URL string for a text blob", async () => {
    const blob = makeBlob("text/plain", "hello");
    const url = await getDataURL(blob);
    expect(typeof url).toBe("string");
    expect(url.startsWith("data:")).toBe(true);
  });

  it("includes the correct mime type in the data URL", async () => {
    const blob = makeBlob(MIME_TYPES.png, "fake-png-data");
    const url = await getDataURL(blob);
    expect(url.startsWith(`data:${MIME_TYPES.png}`)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getDataURL_sync
// ---------------------------------------------------------------------------

describe("getDataURL_sync", () => {
  it("returns a data URL for a string input", () => {
    const url = getDataURL_sync("hello", MIME_TYPES.json);
    expect(url.startsWith(`data:${MIME_TYPES.json};base64,`)).toBe(true);
  });

  it("returns a data URL for a Uint8Array input", () => {
    const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const url = getDataURL_sync(data, MIME_TYPES.png);
    expect(url.startsWith(`data:${MIME_TYPES.png};base64,`)).toBe(true);
  });

  it("returns a data URL for an ArrayBuffer input", () => {
    const buffer = new Uint8Array([1, 2, 3]).buffer;
    const url = getDataURL_sync(buffer, MIME_TYPES.png);
    expect(url.startsWith(`data:${MIME_TYPES.png};base64,`)).toBe(true);
  });

  it("round-trips: dataURLToString(getDataURL_sync(text)) === text", () => {
    const original = "round-trip test";
    const url = getDataURL_sync(original, MIME_TYPES.json) as DataURL;
    expect(dataURLToString(url)).toBe(original);
  });
});

// ---------------------------------------------------------------------------
// dataURLToFile
// ---------------------------------------------------------------------------

describe("dataURLToFile", () => {
  it("converts a data URL back to a File", async () => {
    const blob = makeBlob(MIME_TYPES.png, "fake-png");
    const url = await getDataURL(blob);
    const file = dataURLToFile(url as DataURL, "output.png");
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("output.png");
    expect(file.type).toBe(MIME_TYPES.png);
  });

  it("defaults to an empty filename when none is provided", async () => {
    const blob = makeBlob(MIME_TYPES.png, "data");
    const url = await getDataURL(blob);
    const file = dataURLToFile(url as DataURL);
    expect(file.name).toBe("");
  });

  it("preserves the original byte content", async () => {
    const original = new Uint8Array([10, 20, 30, 40]);
    const blob = new Blob([original], { type: MIME_TYPES.png });
    const url = await getDataURL(blob);
    const file = dataURLToFile(url as DataURL, "test.png");
    const restored = new Uint8Array(await blobToArrayBuffer(file));
    expect(restored).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// dataURLToString
// ---------------------------------------------------------------------------

describe("dataURLToString", () => {
  it("decodes a base64 data URL back to the original string", () => {
    const text = "hello world";
    const url = getDataURL_sync(text, MIME_TYPES.json) as DataURL;
    expect(dataURLToString(url)).toBe(text);
  });

  it("handles unicode content", () => {
    const text = "こんにちは";
    const url = getDataURL_sync(text, MIME_TYPES.json) as DataURL;
    expect(dataURLToString(url)).toBe(text);
  });
});

// ---------------------------------------------------------------------------
// canvasToBlob
// ---------------------------------------------------------------------------

describe("canvasToBlob", () => {
  it("resolves with a Blob for a valid canvas", async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 10;
    canvas.height = 10;
    const blob = await canvasToBlob(canvas);
    expect(blob).toBeInstanceOf(Blob);
  });

  it("accepts a Promise<HTMLCanvasElement>", async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 10;
    canvas.height = 10;
    const blob = await canvasToBlob(Promise.resolve(canvas));
    expect(blob).toBeInstanceOf(Blob);
  });

  it("rejects with CanvasError when toBlob returns null", async () => {
    const canvas = document.createElement("canvas");
    // Force toBlob to call back with null
    canvas.toBlob = (cb) => cb(null);
    await expect(canvasToBlob(canvas)).rejects.toMatchObject({
      name: "CANVAS_POSSIBLY_TOO_BIG",
    });
  });
});

// ---------------------------------------------------------------------------
// generateIdFromFile
// ---------------------------------------------------------------------------

describe("generateIdFromFile", () => {
  it("returns a 40-character hex string for a normal file", async () => {
    const file = makeFile("test.png", MIME_TYPES.png, "some content");
    const id = await generateIdFromFile(file);
    // SHA-1 hex is 40 chars
    expect(id).toHaveLength(40);
    expect(/^[0-9a-f]+$/.test(id)).toBe(true);
  });

  it("returns the same id for the same file content", async () => {
    const file1 = makeFile("a.png", MIME_TYPES.png, "same content");
    const file2 = makeFile("b.png", MIME_TYPES.png, "same content");
    const [id1, id2] = await Promise.all([
      generateIdFromFile(file1),
      generateIdFromFile(file2),
    ]);
    expect(id1).toBe(id2);
  });

  it("returns different ids for different file content", async () => {
    const file1 = makeFile("a.png", MIME_TYPES.png, "content A");
    const file2 = makeFile("b.png", MIME_TYPES.png, "content B");
    const [id1, id2] = await Promise.all([
      generateIdFromFile(file1),
      generateIdFromFile(file2),
    ]);
    expect(id1).not.toBe(id2);
  });

  it("falls back to a 40-char nanoid when crypto.subtle is unavailable", async () => {
    const originalDigest = window.crypto.subtle.digest;
    // @ts-ignore
    window.crypto.subtle.digest = vi
      .fn()
      .mockRejectedValue(new Error("not supported"));

    const file = makeFile("test.png", MIME_TYPES.png, "data");
    const id = await generateIdFromFile(file);
    expect(id).toHaveLength(40);

    window.crypto.subtle.digest = originalDigest;
  });
});

// ---------------------------------------------------------------------------
// normalizeFile
// ---------------------------------------------------------------------------

describe("normalizeFile", () => {
  it("sets mime type to excalidrawlib for .excalidrawlib files", async () => {
    const file = makeFile("lib.excalidrawlib", "", "{}");
    const normalized = await normalizeFile(file);
    expect(normalized.type).toBe(MIME_TYPES.excalidrawlib);
  });

  it("sets mime type to excalidraw for .excalidraw files", async () => {
    const file = makeFile("scene.excalidraw", "", "{}");
    const normalized = await normalizeFile(file);
    expect(normalized.type).toBe(MIME_TYPES.excalidraw);
  });

  it("does not re-normalize an already-normalized file", async () => {
    const file = makeFile("scene.excalidraw", "", "{}");
    const first = await normalizeFile(file);
    // second call should return the same instance
    const second = await normalizeFile(first);
    expect(second).toBe(first);
  });

  it("returns the file unchanged when type is already correct and not an image", async () => {
    const file = makeFile("data.json", MIME_TYPES.json, "{}");
    const normalized = await normalizeFile(file);
    // json files don't match any special branch, type stays the same
    expect(normalized.type).toBe(MIME_TYPES.json);
  });

  it("corrects mime type for a PNG file with wrong extension based on magic bytes", async () => {
    // Build a real minimal PNG header (8 bytes: 137 80 78 71 13 10 26 10)
    const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    // Pad to 15 bytes so the slice(0,15) check works
    const pngBytes = new Uint8Array(15);
    pngBytes.set(pngHeader);

    // File claims to be jpeg but has PNG magic bytes
    const file = new File([pngBytes], "image.jpg", { type: MIME_TYPES.jpg });
    const normalized = await normalizeFile(file);
    expect(normalized.type).toBe(MIME_TYPES.png);
  });
});
