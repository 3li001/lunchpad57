const { isValidPlate, isValidYear, isValidMpg } = require("../lib/validation")

// ─── Number Plate ────────────────────────────────────────────────────────────

describe("isValidPlate", () => {
    test("accepts a standard plate without space", () => {
        expect(isValidPlate("AB12CDE")).toBe(true)
    })

    test("accepts a UK plate with space", () => {
        expect(isValidPlate("AB12 CDE")).toBe(true)
    })

    test("accepts lowercase (normalised internally)", () => {
        expect(isValidPlate("ab12 cde")).toBe(true)
    })

    test("accepts a short plate", () => {
        expect(isValidPlate("AB12")).toBe(true)
    })

    test("rejects a plate with special characters", () => {
        expect(isValidPlate("AB!2 CDE")).toBe(false)
    })

    test("rejects an empty string", () => {
        expect(isValidPlate("")).toBe(false)
    })

    test("rejects a plate that is too long", () => {
        expect(isValidPlate("ABCDE12345")).toBe(false)
    })

    test("rejects a non-string value", () => {
        expect(isValidPlate(null)).toBe(false)
        expect(isValidPlate(123)).toBe(false)
    })
})

// ─── Vehicle Year ─────────────────────────────────────────────────────────────

describe("isValidYear", () => {
    test("accepts a normal modern year", () => {
        expect(isValidYear(2020)).toBe(true)
    })

    test("accepts the boundary year 1900", () => {
        expect(isValidYear(1900)).toBe(true)
    })

    test("accepts next year", () => {
        const nextYear = new Date().getFullYear() + 1
        expect(isValidYear(nextYear)).toBe(true)
    })

    test("rejects a year before 1900", () => {
        expect(isValidYear(1899)).toBe(false)
    })

    test("rejects a year too far in the future", () => {
        const farFuture = new Date().getFullYear() + 2
        expect(isValidYear(farFuture)).toBe(false)
    })

    test("rejects a non-numeric string", () => {
        expect(isValidYear("abc")).toBe(false)
    })

    test("accepts a year passed as a string number", () => {
        expect(isValidYear("2019")).toBe(true)
    })
})

// ─── MPG ─────────────────────────────────────────────────────────────────────

describe("isValidMpg", () => {
    test("accepts a normal MPG", () => {
        expect(isValidMpg(35)).toBe(true)
    })

    test("accepts the minimum boundary (1)", () => {
        expect(isValidMpg(1)).toBe(true)
    })

    test("accepts the maximum boundary (200)", () => {
        expect(isValidMpg(200)).toBe(true)
    })

    test("rejects 0", () => {
        expect(isValidMpg(0)).toBe(false)
    })

    test("rejects a value above 200", () => {
        expect(isValidMpg(201)).toBe(false)
    })

    test("rejects a non-numeric string", () => {
        expect(isValidMpg("fast")).toBe(false)
    })

    test("accepts MPG passed as a string number", () => {
        expect(isValidMpg("50")).toBe(true)
    })
})
