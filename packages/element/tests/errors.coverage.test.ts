import { describe, expect, it } from "vitest";

import {
  AbortError,
  CanvasError,
  ExcalidrawError,
  ImageSceneDataError,
  RequestError,
  WorkerInTheMainChunkError,
  WorkerUrlNotDefinedError,
} from "../../excalidraw/errors";

describe("errors coverage", () => {
  describe("CanvasError", () => {
    it("uses default message and name", () => {
      const error = new CanvasError();

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("CANVAS_ERROR");
      expect(error.message).toBe("Couldn't export canvas.");
    });

    it("uses custom message and name", () => {
      const error = new CanvasError("Canvas is too big", "CANVAS_POSSIBLY_TOO_BIG");

      expect(error.name).toBe("CANVAS_POSSIBLY_TOO_BIG");
      expect(error.message).toBe("Canvas is too big");
    });
  });

  describe("AbortError", () => {
    it("creates DOMException with AbortError name", () => {
      const error = new AbortError();

      expect(error).toBeInstanceOf(DOMException);
      expect(error.name).toBe("AbortError");
      expect(error.message).toBe("Request Aborted");
    });

    it("uses custom abort message", () => {
      const error = new AbortError("Custom abort");

      expect(error.name).toBe("AbortError");
      expect(error.message).toBe("Custom abort");
    });
  });

  describe("ImageSceneDataError", () => {
    it("uses default message, name and code", () => {
      const error = new ImageSceneDataError();

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("EncodingError");
      expect(error.message).toBe("Image Scene Data Error");
      expect(error.code).toBe("IMAGE_SCENE_DATA_ERROR");
    });

    it("uses custom message and code", () => {
      const error = new ImageSceneDataError(
        "No scene data",
        "IMAGE_NOT_CONTAINS_SCENE_DATA",
      );

      expect(error.name).toBe("EncodingError");
      expect(error.message).toBe("No scene data");
      expect(error.code).toBe("IMAGE_NOT_CONTAINS_SCENE_DATA");
    });
  });

  describe("worker errors", () => {
    it("creates WorkerUrlNotDefinedError with defaults", () => {
      const error = new WorkerUrlNotDefinedError();

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("WorkerUrlNotDefinedError");
      expect(error.message).toBe("Worker URL is not defined!");
      expect(error.code).toBe("WORKER_URL_NOT_DEFINED");
    });

    it("creates WorkerInTheMainChunkError with defaults", () => {
      const error = new WorkerInTheMainChunkError();

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("WorkerInTheMainChunkError");
      expect(error.message).toBe("Worker has to be in a separate chunk!");
      expect(error.code).toBe("WORKER_IN_THE_MAIN_CHUNK");
    });

    it("allows custom worker error messages", () => {
      const urlError = new WorkerUrlNotDefinedError("Missing worker url");
      const chunkError = new WorkerInTheMainChunkError("Invalid worker chunk");

      expect(urlError.message).toBe("Missing worker url");
      expect(chunkError.message).toBe("Invalid worker chunk");
    });
  });

  describe("ExcalidrawError", () => {
    it("sets stable error name", () => {
      const error = new ExcalidrawError("Handled error");

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("ExcalidrawError");
      expect(error.message).toBe("Handled error");
    });
  });

  describe("RequestError", () => {
    it("uses default values", () => {
      const error = new RequestError();

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("RequestError");
      expect(error.message).toBe("Something went wrong");
      expect(error.status).toBe(500);
      expect(error.data).toBeUndefined();
    });

    it("uses custom values", () => {
      const data = { reason: "invalid" };
      const error = new RequestError({
        message: "Bad request",
        status: 400,
        data,
      });

      expect(error.name).toBe("RequestError");
      expect(error.message).toBe("Bad request");
      expect(error.status).toBe(400);
      expect(error.data).toBe(data);
    });

    it("serializes to plain object", () => {
      const error = new RequestError({
        message: "Forbidden",
        status: 403,
        data: { secret: true },
      });

      expect(error.toObject()).toEqual({
        name: "RequestError",
        status: 403,
        message: "Forbidden",
      });
    });
  });
});
