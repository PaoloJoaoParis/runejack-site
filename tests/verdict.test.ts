import { describe, expect, it } from "vitest";
import type { Evidence } from "../src/lib/feedback";
import { decideVerdict, onlyUsesEvidenceNumbers, weightedAverage } from "../src/lib/verdict";

describe("decideVerdict", () => {
  it("manque de données sous 30 runs", () => {
    expect(decideVerdict("too_strong", 12, 20)).toBe("insufficient");
  });
  it("confirme un élément nettement au-dessus de la moyenne", () => {
    expect(decideVerdict("too_strong", 240, 8.4)).toBe("confirmed");
  });
  it("contredit un écart trop faible", () => {
    expect(decideVerdict("too_strong", 240, 2)).toBe("contradicted");
  });
  it("confirme un élément trop faible", () => {
    expect(decideVerdict("too_weak", 100, -6)).toBe("confirmed");
  });
  it("ne juge pas sans thèse", () => {
    expect(decideVerdict("other", 500, 30)).toBe("not_applicable");
  });
});

describe("weightedAverage", () => {
  it("pondère par le nombre de runs", () => {
    const lines = [
      { name: "A", runs: 100, winRate: 60 },
      { name: "B", runs: 300, winRate: 40 },
    ];
    expect(weightedAverage(lines)).toBe(45);
  });
});

describe("onlyUsesEvidenceNumbers", () => {
  const evidence: Evidence = {
    name: "Ensorceleuse",
    runs: 240,
    winRate: 61.3,
    categoryAverage: 52.9,
    gap: 8.4,
    computedAt: "2026-10-16T10:00:00.000Z",
  };

  it("accepte les chiffres fournis, virgule comprise", () => {
    expect(onlyUsesEvidenceNumbers("Elle gagne 61,3 % de ses 240 runs.", evidence)).toBe(true);
  });
  it("refuse un chiffre inventé", () => {
    expect(onlyUsesEvidenceNumbers("Elle gagne 70 % de ses runs.", evidence)).toBe(false);
  });
});
