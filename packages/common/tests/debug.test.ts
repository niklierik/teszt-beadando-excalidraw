import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { Debug } from "../debug";

// Reset all static state between tests
const resetDebug = () => {
  // Stop any running interval/animation frame
  (Debug as any).DEBUG_LOG_INTERVAL_ID = null;
  (Debug as any).ANIMATION_FRAME_ID = null;
  (Debug as any).TIMES_AGGR = {};
  (Debug as any).TIMES_AVG = {};
  (Debug as any).LAST_DEBUG_LOG_CALL = 0;
  (Debug as any).FRAME_COUNT = 0;
  (Debug as any).LAST_FRAME_TIMESTAMP = 0;
  (Debug as any).CHANGED_CACHE = {};
  Debug.DEBUG_LOG_TIMES = true;
};

describe("Debug", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "time").mockImplementation(() => {});
    vi.spyOn(console, "timeEnd").mockImplementation(() => {});
    resetDebug();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    resetDebug();
  });

  // ─── logTime ────────────────────────────────────────────────────────────────

  describe("logTime", () => {
    it("records the first call without pushing a time entry", () => {
      // Advance time so performance.now() returns non-zero, ensuring t is set
      vi.advanceTimersByTime(10);
      Debug.logTime(undefined, "test");
      expect((Debug as any).TIMES_AGGR["test"].times).toHaveLength(0);
    });

    it("records elapsed time between two calls", () => {
      vi.advanceTimersByTime(10);
      Debug.logTime(undefined, "test");
      vi.advanceTimersByTime(10);
      Debug.logTime(undefined, "test");
      expect((Debug as any).TIMES_AGGR["test"].times).toHaveLength(1);
    });

    it("uses the explicitly provided time value instead of measuring", () => {
      vi.advanceTimersByTime(10);
      Debug.logTime(undefined, "explicit");
      vi.advanceTimersByTime(10);
      Debug.logTime(42, "explicit");
      expect((Debug as any).TIMES_AGGR["explicit"].times[0]).toBe(42);
    });

    it("uses 'default' as the name when none is provided", () => {
      vi.advanceTimersByTime(10);
      Debug.logTime(10);
      vi.advanceTimersByTime(10);
      Debug.logTime(10);
      expect((Debug as any).TIMES_AGGR["default"]).toBeDefined();
    });

    it("tracks multiple named timers independently", () => {
      vi.advanceTimersByTime(10);
      Debug.logTime(5, "a");
      vi.advanceTimersByTime(10);
      Debug.logTime(5, "a");
      vi.advanceTimersByTime(10);
      Debug.logTime(7, "b");
      vi.advanceTimersByTime(10);
      Debug.logTime(7, "b");
      expect((Debug as any).TIMES_AGGR["a"].times[0]).toBe(5);
      expect((Debug as any).TIMES_AGGR["b"].times[0]).toBe(7);
    });
  });

  // ─── logTimeAverage ─────────────────────────────────────────────────────────

  describe("logTimeAverage", () => {
    it("records the first call without pushing a time entry", () => {
      vi.advanceTimersByTime(10);
      Debug.logTimeAverage(undefined, "avg");
      expect((Debug as any).TIMES_AVG["avg"].times).toHaveLength(0);
    });

    it("uses the explicitly provided time value", () => {
      vi.advanceTimersByTime(10);
      Debug.logTimeAverage(undefined, "avg");
      vi.advanceTimersByTime(10);
      Debug.logTimeAverage(99, "avg");
      expect((Debug as any).TIMES_AVG["avg"].times[0]).toBe(99);
    });

    it("uses 'default' as the name when none is provided", () => {
      vi.advanceTimersByTime(10);
      Debug.logTimeAverage(10);
      vi.advanceTimersByTime(10);
      Debug.logTimeAverage(10);
      expect((Debug as any).TIMES_AVG["default"]).toBeDefined();
    });
  });

  // ─── logTimeWrap / logTimeAverageWrap ────────────────────────────────────────

  describe("logTimeWrap", () => {
    it("returns the wrapped function's return value", () => {
      const add = (a: number, b: number) => a + b;
      const wrapped = Debug.logTimeWrap(add, "add");
      expect(wrapped(2, 3)).toBe(5);
    });

    it("forwards all arguments to the wrapped function", () => {
      const spy = vi.fn((x: number) => x * 2);
      const wrapped = Debug.logTimeWrap(spy, "spy");
      wrapped(7);
      expect(spy).toHaveBeenCalledWith(7);
    });

    it("records a timing entry after the call", () => {
      vi.advanceTimersByTime(10);
      const wrapped = Debug.logTimeWrap(() => {}, "wrap-test");
      wrapped();
      vi.advanceTimersByTime(10);
      wrapped(); // second call records elapsed time from first
      expect((Debug as any).TIMES_AGGR["wrap-test"].times).toHaveLength(1);
    });
  });

  describe("logTimeAverageWrap", () => {
    it("returns the wrapped function's return value", () => {
      const wrapped = Debug.logTimeAverageWrap((x: string) => x.toUpperCase(), "upper");
      expect(wrapped("hello")).toBe("HELLO");
    });

    it("records a timing entry in TIMES_AVG after the call", () => {
      vi.advanceTimersByTime(10);
      const wrapped = Debug.logTimeAverageWrap(() => {}, "avg-wrap");
      wrapped();
      vi.advanceTimersByTime(10);
      wrapped();
      expect((Debug as any).TIMES_AVG["avg-wrap"].times).toHaveLength(1);
    });
  });

  // ─── perfWrap ───────────────────────────────────────────────────────────────

  describe("perfWrap", () => {
    it("returns the wrapped function's return value", () => {
      const wrapped = Debug.perfWrap((n: number) => n + 1, "perf");
      expect(wrapped(4)).toBe(5);
    });

    it("calls console.time and console.timeEnd with the given name", () => {
      const wrapped = Debug.perfWrap(() => {}, "my-perf");
      wrapped();
      expect(console.time).toHaveBeenCalledWith("my-perf");
      expect(console.timeEnd).toHaveBeenCalledWith("my-perf");
    });

    it("uses 'default' as the name when none is provided", () => {
      const wrapped = Debug.perfWrap(() => {});
      wrapped();
      expect(console.time).toHaveBeenCalledWith("default");
    });

    it("forwards all arguments to the wrapped function", () => {
      const spy = vi.fn();
      const wrapped = Debug.perfWrap(spy, "fwd");
      wrapped(1, 2, 3);
      expect(spy).toHaveBeenCalledWith(1, 2, 3);
    });
  });

  // ─── logChanged ─────────────────────────────────────────────────────────────

  describe("logChanged", () => {
    it("does not log on the first call (no previous state)", () => {
      Debug.logChanged("comp", { x: 1 });
      expect(console.info).not.toHaveBeenCalled();
    });

    it("does not log when nothing changed between calls", () => {
      Debug.logChanged("comp", { x: 1 });
      Debug.logChanged("comp", { x: 1 });
      expect(console.info).not.toHaveBeenCalled();
    });

    it("logs changed keys when a value changes", () => {
      Debug.logChanged("comp", { x: 1 });
      Debug.logChanged("comp", { x: 2 });
      expect(console.info).toHaveBeenCalledWith(
        "[comp] changed:",
        expect.objectContaining({ x: { prev: 1, next: 2 } }),
      );
    });

    it("logs when a key is added", () => {
      Debug.logChanged("comp", { x: 1 });
      Debug.logChanged("comp", { x: 1, y: 2 });
      expect(console.info).toHaveBeenCalledWith(
        "[comp] changed:",
        expect.objectContaining({ y: { prev: undefined, next: 2 } }),
      );
    });

    it("logs when a key is removed", () => {
      Debug.logChanged("comp", { x: 1, y: 2 });
      Debug.logChanged("comp", { x: 1 });
      expect(console.info).toHaveBeenCalledWith(
        "[comp] changed:",
        expect.objectContaining({ y: { prev: 2, next: undefined } }),
      );
    });

    it("performs deep equality checks on nested objects", () => {
      Debug.logChanged("comp", { nested: { a: 1 } });
      // Same deep value — should NOT log
      Debug.logChanged("comp", { nested: { a: 1 } });
      expect(console.info).not.toHaveBeenCalled();
    });

    it("detects changes in nested objects", () => {
      Debug.logChanged("comp", { nested: { a: 1 } });
      Debug.logChanged("comp", { nested: { a: 2 } });
      expect(console.info).toHaveBeenCalled();
    });

    it("tracks multiple named components independently", () => {
      Debug.logChanged("A", { x: 1 });
      Debug.logChanged("B", { x: 1 });
      Debug.logChanged("A", { x: 2 }); // only A changed
      expect(console.info).toHaveBeenCalledTimes(1);
      expect(console.info).toHaveBeenCalledWith(
        "[A] changed:",
        expect.anything(),
      );
    });

    it("handles array values with deep equality", () => {
      Debug.logChanged("comp", { arr: [1, 2, 3] });
      Debug.logChanged("comp", { arr: [1, 2, 3] }); // same — no log
      expect(console.info).not.toHaveBeenCalled();
    });

    it("detects changes in array values", () => {
      Debug.logChanged("comp", { arr: [1, 2, 3] });
      Debug.logChanged("comp", { arr: [1, 2, 4] });
      expect(console.info).toHaveBeenCalled();
    });
  });

  // ─── lessPrecise (via debugLogger / TIMES_AGGR output) ──────────────────────
  //
  // lessPrecise(num, precision=5) = parseFloat(num.toPrecision(precision))
  // It is called twice per TIMES_AGGR entry: once on the total and once on
  // each individual time value in the sorted array.

  describe("lessPrecise (via debugLogger)", () => {
    // Helper: record two logTime entries then fire the interval logger.
    const fireLogger = (times: number[], name: string) => {
      // Seed TIMES_AGGR directly so we control the exact values.
      (Debug as any).TIMES_AGGR[name] = { t: 1, times: [...times] };
      // Trigger the private debugLogger via the interval.
      (Debug as any).DEBUG_LOG_INTERVAL_ID = 1; // pretend interval is running
      (Debug as any).LAST_DEBUG_LOG_CALL = Date.now(); // keep it alive
      (Debug as any).debugLogger();
    };

    it("rounds the total to 5 significant figures", () => {
      // 1.23456789 + 2.34567891 = 3.5802468 → toPrecision(5) → "3.5802" → 3.5802
      fireLogger([1.23456789, 2.34567891], "total-precision");
      const [, total] = (console.info as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(total).toBe(parseFloat((3.5802468).toPrecision(5)));
    });

    it("rounds each individual time in the sorted array to 5 significant figures", () => {
      fireLogger([3.141592653, 2.718281828], "individual-precision");
      // sorted ascending: [2.718281828, 3.141592653]
      const [, , sortedArr] = (console.info as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(sortedArr[0]).toBe(parseFloat((2.718281828).toPrecision(5)));
      expect(sortedArr[1]).toBe(parseFloat((3.141592653).toPrecision(5)));
    });

    it("sorts the individual times in ascending order before rounding", () => {
      fireLogger([10, 1, 5], "sort-order");
      const [, , sortedArr] = (console.info as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(sortedArr).toEqual([1, 5, 10]);
    });

    it("handles a single time entry (total equals the one value)", () => {
      fireLogger([7.654321], "single");
      const [, total, sortedArr] = (
        console.info as ReturnType<typeof vi.fn>
      ).mock.calls[0];
      expect(total).toBe(parseFloat((7.654321).toPrecision(5)));
      expect(sortedArr).toHaveLength(1);
    });

    it("clears the times array after logging, keeping the entry alive", () => {
      fireLogger([5, 10], "clear-after-log");
      expect((Debug as any).TIMES_AGGR["clear-after-log"].times).toHaveLength(
        0,
      );
      expect((Debug as any).TIMES_AGGR["clear-after-log"]).toBeDefined();
    });

    it("skips entries with no recorded times", () => {
      (Debug as any).TIMES_AGGR["empty"] = { t: 1, times: [] };
      (Debug as any).DEBUG_LOG_INTERVAL_ID = 1;
      (Debug as any).LAST_DEBUG_LOG_CALL = Date.now();
      (Debug as any).debugLogger();
      expect(console.info).not.toHaveBeenCalled();
    });
  });

  // ─── getAvgFrameTime (via debugLogger / TIMES_AVG output) ───────────────────
  //
  // getAvgFrameTime(times) = lessPrecise(times.reduce((a,b)=>a+b) / times.length)
  // It is used to compute the running avg stored in TIMES_AVG[name].avg across
  // multiple interval ticks.

  describe("getAvgFrameTime (via debugLogger)", () => {
    const fireAvgLogger = (
      times: number[],
      frameCount: number,
      name: string,
      existingAvg: number | null = null,
    ) => {
      (Debug as any).TIMES_AVG[name] = {
        t: 1,
        times: [...times],
        avg: existingAvg,
      };
      (Debug as any).FRAME_COUNT = frameCount;
      (Debug as any).DEBUG_LOG_INTERVAL_ID = 1;
      (Debug as any).LAST_DEBUG_LOG_CALL = Date.now();
      (Debug as any).debugLogger();
    };

    it("stores the per-frame average in TIMES_AVG[name].avg on first tick", () => {
      // totalTime = 30, frameCount = 3 → avgFrameTime = lessPrecise(10)
      fireAvgLogger([10, 10, 10], 3, "avg-first");
      expect((Debug as any).TIMES_AVG["avg-first"].avg).toBe(
        parseFloat((10).toPrecision(5)),
      );
    });

    it("blends the new avg with the previous avg using getAvgFrameTime on subsequent ticks", () => {
      // First tick: avg = lessPrecise(20/2) = 10
      fireAvgLogger([10, 10], 2, "avg-blend");
      const firstAvg = (Debug as any).TIMES_AVG["avg-blend"].avg; // 10

      // Second tick: new avgFrameTime = lessPrecise(30/3) = 10
      // blended = getAvgFrameTime([firstAvg, 10]) = lessPrecise((firstAvg+10)/2)
      fireAvgLogger([10, 10, 10], 3, "avg-blend", firstAvg);
      const blended = (Debug as any).TIMES_AVG["avg-blend"].avg;
      const expected = parseFloat(
        ((firstAvg + parseFloat((10).toPrecision(5))) / 2).toPrecision(5),
      );
      expect(blended).toBe(expected);
    });

    it("resets FRAME_COUNT to 0 after logging", () => {
      fireAvgLogger([5, 5], 2, "frame-reset");
      expect((Debug as any).FRAME_COUNT).toBe(0);
    });

    it("clears the times array after logging", () => {
      fireAvgLogger([5, 5], 2, "avg-clear");
      expect((Debug as any).TIMES_AVG["avg-clear"].times).toHaveLength(0);
    });

    it("skips entries with no recorded times", () => {
      (Debug as any).TIMES_AVG["empty-avg"] = { t: 1, times: [], avg: null };
      (Debug as any).FRAME_COUNT = 5;
      (Debug as any).DEBUG_LOG_INTERVAL_ID = 1;
      (Debug as any).LAST_DEBUG_LOG_CALL = Date.now();
      (Debug as any).debugLogger();
      expect(console.info).not.toHaveBeenCalled();
    });

    it("does not log when DEBUG_LOG_TIMES is false", () => {
      Debug.DEBUG_LOG_TIMES = false;
      fireAvgLogger([10, 10], 2, "no-log");
      expect(console.info).not.toHaveBeenCalled();
    });
  });

  // ─── interval / auto-stop behaviour ─────────────────────────────────────────

  describe("interval setup and teardown", () => {
    it("starts the interval on the first logTime call", () => {
      const setIntervalSpy = vi.spyOn(window, "setInterval");
      Debug.logTime(10, "interval-test");
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it("does not start a second interval on subsequent calls", () => {
      const setIntervalSpy = vi.spyOn(window, "setInterval");
      Debug.logTime(10, "once");
      Debug.logTime(10, "once");
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    });

    it("clears the interval and resets state after inactivity", () => {
      const clearIntervalSpy = vi.spyOn(window, "clearInterval");

      Debug.logTime(10, "stop-test");
      // Advance past the 600 ms inactivity threshold + one interval tick
      vi.advanceTimersByTime(2000);

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect((Debug as any).DEBUG_LOG_INTERVAL_ID).toBeNull();
      expect((Debug as any).TIMES_AGGR).toEqual({});
      expect((Debug as any).TIMES_AVG).toEqual({});
    });
  });
});
