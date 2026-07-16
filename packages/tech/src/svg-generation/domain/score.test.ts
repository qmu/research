import { describe, expect, it } from "vitest";
import {
  hasAnimation,
  scoreAnimationPresence,
  scorePathComplexity,
  scoreRenderValidity,
  summarizeStat,
} from "./score";
import { extractSvg } from "./extract";

describe("scoreRenderValidity", () => {
  it("scores a well-formed svg-rooted document 1", () => {
    expect(scoreRenderValidity("<svg><rect/></svg>")).toBe(1);
  });

  it("scores malformed xml 0", () => {
    expect(scoreRenderValidity("<svg><rect></svg>")).toBe(0);
  });

  it("scores a well-formed non-svg root 0", () => {
    expect(scoreRenderValidity("<html><body/></html>")).toBe(0);
  });

  it("ignores a namespace prefix on the root", () => {
    expect(
      scoreRenderValidity('<svg:svg xmlns:svg="x"><svg:g/></svg:svg>'),
    ).toBe(1);
  });
});

describe("scorePathComplexity", () => {
  it("counts drawable elements and path commands", () => {
    // 1 rect + 1 path element = 2 elements; the d has M, L, L, Z = 4 commands.
    const svg = '<svg><rect/><path d="M0 0 L1 1 L2 2 Z"/></svg>';
    expect(scorePathComplexity(svg)).toBe(6);
  });

  it("is zero for an empty svg", () => {
    expect(scorePathComplexity("<svg></svg>")).toBe(0);
  });
});

describe("animation detection", () => {
  it("detects a SMIL animate element", () => {
    expect(
      hasAnimation('<svg><circle><animate attributeName="r"/></circle></svg>'),
    ).toBe(true);
  });

  it("detects a CSS keyframes animation", () => {
    expect(
      hasAnimation("<svg><style>@keyframes spin{to{}}</style></svg>"),
    ).toBe(true);
  });

  it("returns 0 for a static svg", () => {
    expect(scoreAnimationPresence("<svg><rect/></svg>")).toBe(0);
  });
});

describe("summarizeStat", () => {
  it("returns all-zero for no values", () => {
    expect(summarizeStat([])).toEqual({ mean: 0, stdDev: 0, n: 0 });
  });

  it("returns zero stdDev for a single value", () => {
    expect(summarizeStat([5])).toEqual({ mean: 5, stdDev: 0, n: 1 });
  });

  it("computes mean and sample stdDev", () => {
    const stat = summarizeStat([1, 1]);
    expect(stat.mean).toBe(1);
    expect(stat.stdDev).toBe(0);
    expect(stat.n).toBe(2);
  });
});

describe("extractSvg", () => {
  it("unwraps a fenced svg block", () => {
    const text = "Here you go:\n```svg\n<svg><rect/></svg>\n```\nEnjoy!";
    expect(extractSvg(text)).toBe("<svg><rect/></svg>");
  });

  it("extracts a bare svg amid prose", () => {
    expect(extractSvg("prose <svg><g/></svg> more prose")).toBe(
      "<svg><g/></svg>",
    );
  });

  it("returns trimmed input when no svg is present", () => {
    expect(extractSvg("  no svg here  ")).toBe("no svg here");
  });
});
