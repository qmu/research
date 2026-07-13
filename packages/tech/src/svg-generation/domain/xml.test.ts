import { describe, expect, it } from "vitest";
import { isWellFormedXml, rootElementName } from "./xml";

describe("isWellFormedXml", () => {
  it("accepts a well-formed svg with nested and self-closing tags", () => {
    expect(
      isWellFormedXml(
        '<svg xmlns="http://www.w3.org/2000/svg"><g><rect x="0" y="0"/></g></svg>',
      ),
    ).toBe(true);
  });

  it("accepts leading declaration and comments", () => {
    expect(
      isWellFormedXml('<?xml version="1.0"?><!-- note --><svg><circle/></svg>'),
    ).toBe(true);
  });

  it("rejects a mismatched closing tag", () => {
    expect(isWellFormedXml("<svg><g></svg></g>")).toBe(false);
  });

  it("rejects an unclosed element", () => {
    expect(isWellFormedXml("<svg><rect></svg>")).toBe(false);
  });

  it("rejects an unterminated tag", () => {
    expect(isWellFormedXml("<svg><rect ")).toBe(false);
  });

  it("rejects a second top-level element (not a single tree)", () => {
    expect(isWellFormedXml("<svg></svg><svg></svg>")).toBe(false);
  });

  it("tolerates '>' inside a quoted attribute value", () => {
    expect(isWellFormedXml('<svg data-x="a>b"><rect/></svg>')).toBe(true);
  });

  it("rejects a stray '<' that starts no valid tag", () => {
    expect(isWellFormedXml("<svg> < </svg>")).toBe(false);
  });
});

describe("rootElementName", () => {
  it("returns the first element name, skipping declarations/comments", () => {
    expect(
      rootElementName('<?xml version="1.0"?><!-- c --><svg><g/></svg>'),
    ).toBe("svg");
  });

  it("returns null when there is no element", () => {
    expect(rootElementName("<!-- only a comment -->")).toBe(null);
  });
});
