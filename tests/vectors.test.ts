import { describe, expect, it } from "vitest";
import { cosineSimilarity, normalize } from "../src/lib/vectors";

describe("normalize", () => {
  it("ramène le vecteur à une longueur de 1", () => {
    const [x, y] = normalize([3, 4]);
    expect(x).toBeCloseTo(0.6);
    expect(y).toBeCloseTo(0.8);
  });
  it("laisse le vecteur nul tel quel", () => {
    expect(normalize([0, 0])).toEqual([0, 0]);
  });
});

describe("cosineSimilarity", () => {
  it("vaut 1 pour deux vecteurs de même direction", () => {
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
  });
  it("vaut 0 pour deux vecteurs sans rapport", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
});
