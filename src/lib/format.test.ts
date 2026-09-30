import { describe, expect, it } from "vitest";
import {
  centsToEuroInput,
  initials,
  maskEmail,
  formatPrice,
  normalizeText,
  parseEuros,
  slugify,
} from "./format";

// Intl uses narrow no-break spaces; compare on plain spaces.
const plain = (text: string) => text.replace(/[  ]/g, " ");

describe("formatPrice", () => {
  it("formats cents as French euros", () => {
    expect(plain(formatPrice(2499))).toBe("24,99 €");
    expect(plain(formatPrice(129950))).toBe("1 299,50 €");
    expect(plain(formatPrice(0))).toBe("0,00 €");
  });
});

describe("parseEuros", () => {
  it.each([
    ["24,99", 2499],
    ["24.99", 2499],
    ["24", 2400],
    ["24,5", 2450],
    [" 1 299,5 ", 129950],
    ["0", 0],
  ])("parses %j as %i cents", (input, cents) => {
    expect(parseEuros(input)).toBe(cents);
  });

  it.each(["", "abc", "-1", "1,999", "12,3,4", "1e3"])(
    "rejects %j",
    (input) => {
      expect(parseEuros(input)).toBeNull();
    },
  );
});

describe("centsToEuroInput", () => {
  it("prints cents in the format the form accepts", () => {
    expect(centsToEuroInput(2499)).toBe("24,99");
    expect(centsToEuroInput(2400)).toBe("24,00");
    expect(parseEuros(centsToEuroInput(129950))).toBe(129950);
  });
});

describe("normalizeText", () => {
  it("lowercases and strips accents", () => {
    expect(normalizeText("  Chaise Élégante ")).toBe("chaise elegante");
    expect(normalizeText("Œuf côtelé")).toBe("œuf cotele");
  });
});

describe("slugify", () => {
  it("builds a url-safe slug", () => {
    expect(slugify("Lampe d'été 60 W !")).toBe("lampe-d-ete-60-w");
    expect(slugify("  --Table   basse--  ")).toBe("table-basse");
    expect(slugify("!!!")).toBe("");
  });
});

describe("maskEmail", () => {
  it("keeps the first letter and the domain", () => {
    expect(maskEmail("jeanne.martin@exemple.fr")).toBe("j•••@exemple.fr");
    expect(maskEmail("a@b.fr")).toBe("a•••@b.fr");
  });

  it("masks a malformed value entirely", () => {
    expect(maskEmail("sans-arobase")).toBe("•••");
  });
});

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    expect(initials("jeanne  martin dupont")).toBe("JM");
    expect(initials("Paul")).toBe("P");
  });
});
