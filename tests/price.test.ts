import { describe, it, expect } from "vitest"; import { calcAmountKobo } from "../src/lib/price";
describe("price", () => { it("computes kobo", () => expect(calcAmountKobo(3, 100)).toBe(30000));
  it("rejects bad input", () => { expect(() => calcAmountKobo(0, 100)).toThrow(); expect(() => calcAmountKobo(1.5, 100)).toThrow(); }); });
