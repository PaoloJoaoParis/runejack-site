import { describe, expect, it } from "vitest";
import { blendedScore, tierFromGap } from "../src/lib/meta";

describe("blendedScore", () => {
  it("suit la simulation quand le héros n'a aucune run", () => {
    expect(blendedScore(0, 0, 50, "A")).toBe(55);
  });
  it("ne laisse pas trois victoires faire passer un héros S", () => {
    const score = blendedScore(3, 100, 50, "B");
    expect(tierFromGap(score - 50)).not.toBe("S");
  });
  it("laisse les vraies runs dominer quand elles sont nombreuses", () => {
    expect(blendedScore(500, 70, 50, "D")).toBeGreaterThan(68);
  });
});

describe("tierFromGap", () => {
  it("classe d'après l'écart à la moyenne", () => {
    expect(tierFromGap(15)).toBe("S");
    expect(tierFromGap(5)).toBe("A");
    expect(tierFromGap(0)).toBe("B");
    expect(tierFromGap(-5)).toBe("C");
    expect(tierFromGap(-15)).toBe("D");
  });
});
