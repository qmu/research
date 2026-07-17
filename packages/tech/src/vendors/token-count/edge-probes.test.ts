import { describe, expect, it } from "vitest";
import { probePngBase64 } from "./edge-probes";

describe("probePngBase64", () => {
  it("emits a deterministic, well-formed PNG", () => {
    const first = probePngBase64(8);
    const second = probePngBase64(8);
    expect(first).toBe(second);
    const bytes = Buffer.from(first, "base64");
    // PNG signature.
    expect([...bytes.subarray(0, 8)]).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
    // IHDR type at offset 12, width/height fields carry the requested size.
    expect(bytes.subarray(12, 16).toString("latin1")).toBe("IHDR");
    expect(bytes.readUInt32BE(16)).toBe(8);
    expect(bytes.readUInt32BE(20)).toBe(8);
    // Ends with IEND.
    expect(
      bytes.subarray(bytes.length - 8, bytes.length - 4).toString("latin1"),
    ).toBe("IEND");
  });
});
