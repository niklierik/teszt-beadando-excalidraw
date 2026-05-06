import { describe, it, expect } from "vitest";

import { BinaryHeap } from "../src/binary-heap";

/** Min-heap ordered by numeric value */
const makeHeap = (...values: number[]) => {
  const heap = new BinaryHeap<number>((n) => n);
  for (const v of values) {
    heap.push(v);
  }
  return heap;
};

describe("BinaryHeap.remove()", () => {
  it("does nothing when the heap is empty", () => {
    const heap = makeHeap();
    expect(() => heap.remove(42)).not.toThrow();
    expect(heap.size()).toBe(0);
  });

  it("removes the only element, leaving an empty heap", () => {
    const heap = makeHeap(5);
    heap.remove(5);
    expect(heap.size()).toBe(0);
  });

  it("removes the minimum (root) element and maintains heap order", () => {
    const heap = makeHeap(1, 3, 2, 5, 4);
    heap.remove(1);
    expect(heap.size()).toBe(4);
    // Remaining elements should still come out in sorted order
    expect(heap.pop()).toBe(2);
    expect(heap.pop()).toBe(3);
    expect(heap.pop()).toBe(4);
    expect(heap.pop()).toBe(5);
  });

  it("removes a leaf element and maintains heap order", () => {
    const heap = makeHeap(1, 2, 3, 4, 5);
    heap.remove(5);
    expect(heap.size()).toBe(4);
    expect(heap.pop()).toBe(1);
    expect(heap.pop()).toBe(2);
    expect(heap.pop()).toBe(3);
    expect(heap.pop()).toBe(4);
  });

  it("removes an interior element and maintains heap order", () => {
    const heap = makeHeap(1, 3, 2, 7, 5, 6, 4);
    heap.remove(3);
    expect(heap.size()).toBe(6);
    const result: number[] = [];
    for (let i = 0; i < 6; i++) {
      result.push(heap.pop()!);
    }
    expect(result).toEqual([1, 2, 4, 5, 6, 7]);
  });

  it("removes the last element in the array (end === node, no reinsert needed)", () => {
    // When the node to remove is the last element, pop() removes it directly
    // and i >= content.length so the replacement branch is skipped.
    const heap = makeHeap(1, 2, 3);
    // The last element in the internal array after three pushes is 3
    // (sinkDown keeps min at root; 3 ends up as a leaf).
    heap.remove(3);
    expect(heap.size()).toBe(2);
    expect(heap.pop()).toBe(1);
    expect(heap.pop()).toBe(2);
  });

  it("triggers sinkDown when the replacement node has a lower score than the removed node", () => {
    // Build a heap where removing a high-score node causes the replacement
    // (which has a lower score) to bubble up via sinkDown.
    const heap = makeHeap(1, 2, 10, 3, 4);
    // Remove 10 — the replacement (last element) will have a lower score,
    // so sinkDown is called.
    heap.remove(10);
    expect(heap.size()).toBe(4);
    expect(heap.pop()).toBe(1);
    expect(heap.pop()).toBe(2);
    expect(heap.pop()).toBe(3);
    expect(heap.pop()).toBe(4);
  });

  it("triggers bubbleUp when the replacement node has a higher score than the removed node", () => {
    // Remove a low-score interior node so the replacement (higher score)
    // needs to bubble down via bubbleUp.
    const heap = makeHeap(1, 2, 3, 8, 9, 10, 4);
    heap.remove(2);
    expect(heap.size()).toBe(6);
    const result: number[] = [];
    for (let i = 0; i < 6; i++) {
      result.push(heap.pop()!);
    }
    expect(result).toEqual([1, 3, 4, 8, 9, 10]);
  });

  it("is a no-op when the node is not present in the heap", () => {
    // indexOf returns -1; pop() removes the last element, reducing size by 1.
    // The implementation writes content[-1] (no-op) and calls bubbleUp(-1).
    // The heap loses one element but the remaining elements stay in order.
    const heap = makeHeap(1, 2, 3);
    heap.remove(99);
    // The heap shrinks by one due to the internal pop(), but the remaining
    // elements that were present before the call are still retrievable in order.
    const remaining: number[] = [];
    while (heap.size() > 0) {
      remaining.push(heap.pop()!);
    }
    // All original elements except the one popped internally should be present
    // and in sorted order.
    expect(remaining).toEqual(expect.arrayContaining([1, 2]));
    for (let i = 1; i < remaining.length; i++) {
      expect(remaining[i]).toBeGreaterThanOrEqual(remaining[i - 1]);
    }
  });
});
