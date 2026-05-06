import { normalizeLink, isLocalLink } from "../src/url";

describe("isLocalLink()", () => {
  it("returns true for a link that contains location.origin", () => {
    expect(isLocalLink(`${location.origin}/some/path`)).toBe(true);
    expect(isLocalLink(location.origin)).toBe(true);
  });

  it("returns true for a relative link starting with /", () => {
    expect(isLocalLink("/relative/path")).toBe(true);
    expect(isLocalLink("/")).toBe(true);
  });

  it("returns false for an external http link", () => {
    expect(isLocalLink("https://example.com")).toBe(false);
  });

  it("returns false for an external link without a protocol", () => {
    expect(isLocalLink("example.com/page")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isLocalLink(null)).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isLocalLink("")).toBe(false);
  });
});

describe("normalizeLink", () => {
  // NOTE not an extensive XSS test suite, just to check if we're not
  // regressing in sanitization
  it("should sanitize links", () => {
    expect(
      // eslint-disable-next-line no-script-url
      normalizeLink(`javascript://%0aalert(document.domain)`).startsWith(
        // eslint-disable-next-line no-script-url
        `javascript:`,
      ),
    ).toBe(false);
    expect(normalizeLink("ola")).toBe("ola");
    expect(normalizeLink(" ola")).toBe("ola");

    expect(normalizeLink("https://www.excalidraw.com")).toBe(
      "https://www.excalidraw.com",
    );
    expect(normalizeLink("www.excalidraw.com")).toBe("www.excalidraw.com");
    expect(normalizeLink("/ola")).toBe("/ola");
    expect(normalizeLink("http://test")).toBe("http://test");
    expect(normalizeLink("ftp://test")).toBe("ftp://test");
    expect(normalizeLink("file://")).toBe("file://");
    expect(normalizeLink("file://")).toBe("file://");
    expect(normalizeLink("[test](https://test)")).toBe("[test](https://test)");
    expect(normalizeLink("[[test]]")).toBe("[[test]]");
    expect(normalizeLink("<test>")).toBe("<test>");
    expect(normalizeLink("test&")).toBe("test&");
  });
});
