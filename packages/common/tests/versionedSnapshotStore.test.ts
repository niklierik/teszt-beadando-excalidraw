import { describe, it, expect, vi } from "vitest";

import { VersionedSnapshotStore } from "../src/versionedSnapshotStore";

describe("VersionedSnapshotStore", () => {
  // ── getSnapshot ──────────────────────────────────────────────────────────

  describe("getSnapshot()", () => {
    it("returns the initial value at version 0", () => {
      const store = new VersionedSnapshotStore(42);
      expect(store.getSnapshot()).toEqual({ version: 0, value: 42 });
    });
  });

  // ── set ──────────────────────────────────────────────────────────────────

  describe("set()", () => {
    it("returns false and does not increment version when value is equal", () => {
      const store = new VersionedSnapshotStore(1);
      expect(store.set(1)).toBe(false);
      expect(store.getSnapshot().version).toBe(0);
    });

    it("returns true, updates value and increments version when value changes", () => {
      const store = new VersionedSnapshotStore(1);
      expect(store.set(2)).toBe(true);
      expect(store.getSnapshot()).toEqual({ version: 1, value: 2 });
    });

    it("notifies all subscribers with the new snapshot", () => {
      const store = new VersionedSnapshotStore("a");
      const sub1 = vi.fn();
      const sub2 = vi.fn();
      store.subscribe(sub1);
      store.subscribe(sub2);

      store.set("b");

      expect(sub1).toHaveBeenCalledWith({ version: 1, value: "b" });
      expect(sub2).toHaveBeenCalledWith({ version: 1, value: "b" });
    });

    it("resolves pending pull waiters and clears them", async () => {
      const store = new VersionedSnapshotStore(0);

      // Create a waiter by pulling at the current version
      const pullPromise = store.pull(0);

      store.set(1);

      const snapshot = await pullPromise;
      expect(snapshot).toEqual({ version: 1, value: 1 });

      // A second set should not re-resolve the already-cleared waiter
      const sub = vi.fn();
      store.subscribe(sub);
      store.set(2);
      expect(sub).toHaveBeenCalledTimes(1);
    });

    it("uses a custom isEqual function to determine equality", () => {
      // Only consider values equal if both are even or both are odd
      const store = new VersionedSnapshotStore(2, (a, b) => a % 2 === b % 2);

      // 2 and 4 are both even → equal → no update
      expect(store.set(4)).toBe(false);
      expect(store.getSnapshot().version).toBe(0);

      // 2 and 3 differ in parity → update
      expect(store.set(3)).toBe(true);
      expect(store.getSnapshot().version).toBe(1);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────

  describe("update()", () => {
    it("applies the updater function and returns true when value changes", () => {
      const store = new VersionedSnapshotStore(10);
      const result = store.update((prev) => prev + 5);
      expect(result).toBe(true);
      expect(store.getSnapshot()).toEqual({ version: 1, value: 15 });
    });

    it("returns false when the updater produces the same value", () => {
      const store = new VersionedSnapshotStore(10);
      const result = store.update((prev) => prev);
      expect(result).toBe(false);
      expect(store.getSnapshot().version).toBe(0);
    });
  });

  // ── subscribe ────────────────────────────────────────────────────────────

  describe("subscribe()", () => {
    it("calls the subscriber on each subsequent set", () => {
      const store = new VersionedSnapshotStore(0);
      const sub = vi.fn();
      store.subscribe(sub);

      store.set(1);
      store.set(2);

      expect(sub).toHaveBeenCalledTimes(2);
    });

    it("returns an unsubscribe function that stops future notifications", () => {
      const store = new VersionedSnapshotStore(0);
      const sub = vi.fn();
      const unsubscribe = store.subscribe(sub);

      store.set(1);
      unsubscribe();
      store.set(2);

      expect(sub).toHaveBeenCalledTimes(1);
    });
  });

  // ── pull ─────────────────────────────────────────────────────────────────

  describe("pull()", () => {
    it("resolves immediately when sinceVersion differs from current version", async () => {
      const store = new VersionedSnapshotStore("hello");
      // Default sinceVersion = -1, current version = 0 → resolves immediately
      const snapshot = await store.pull();
      expect(snapshot).toEqual({ version: 0, value: "hello" });
    });

    it("resolves immediately when an explicit sinceVersion differs", async () => {
      const store = new VersionedSnapshotStore("x");
      store.set("y"); // version is now 1
      const snapshot = await store.pull(0);
      expect(snapshot).toEqual({ version: 1, value: "y" });
    });

    it("waits until the next set when sinceVersion matches current version", async () => {
      const store = new VersionedSnapshotStore(0);
      const pullPromise = store.pull(0); // version is 0, so it waits

      // Not yet resolved
      let resolved = false;
      pullPromise.then(() => {
        resolved = true;
      });

      await Promise.resolve(); // flush microtasks
      expect(resolved).toBe(false);

      store.set(99);
      const snapshot = await pullPromise;
      expect(snapshot).toEqual({ version: 1, value: 99 });
    });

    it("multiple concurrent pullers all receive the next snapshot", async () => {
      const store = new VersionedSnapshotStore(0);
      const p1 = store.pull(0);
      const p2 = store.pull(0);

      store.set(7);

      const [s1, s2] = await Promise.all([p1, p2]);
      expect(s1).toEqual({ version: 1, value: 7 });
      expect(s2).toEqual({ version: 1, value: 7 });
    });
  });
});
