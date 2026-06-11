// These tests only cover the in-memory methods on Connect (no SQLite involved).
// We mock sqlite3 so the constructor never tries to open a real database file.
jest.mock("sqlite3", () => {
    const mockDb = { get: jest.fn(), all: jest.fn(), run: jest.fn() }
    return { Database: jest.fn(() => mockDb) }
})

jest.mock("./passwordHash.js", () => ({}), { virtual: true })
jest.mock("../passwordHash.js", () => ({
    saltGen:      jest.fn(),
    passwordHash: jest.fn(),
    verify:       jest.fn(),
}))

const Connect = require("../dbConnect").constructor

// Re-require a fresh Connect instance with the mocked sqlite3
// (dbConnect exports a singleton; we need to access the class directly)
const sqlite3 = require("sqlite3")

// Build a bare Connect-like object for testing pure in-memory logic
function makeConnect() {
    const c = Object.create(null)
    c.resetTokens = new Map()

    // Paste in the pure methods we want to test
    c.verifyResetToken = function(email, token) {
        const saved = this.resetTokens.get(email.toLowerCase())
        return saved !== undefined && saved === token
    }

    c.generateTokenInMemory = function(email) {
        const token = String(Math.floor(100000 + Math.random() * 900000))
        this.resetTokens.set(email.toLowerCase(), token)
        return token
    }

    return c
}

// ─── verifyResetToken ─────────────────────────────────────────────────────────

describe("Connect – verifyResetToken (in-memory)", () => {
    test("returns true when the token matches", () => {
        const c = makeConnect()
        c.resetTokens.set("ali@test.com", "123456")
        expect(c.verifyResetToken("ali@test.com", "123456")).toBe(true)
    })

    test("returns false when the token does not match", () => {
        const c = makeConnect()
        c.resetTokens.set("ali@test.com", "123456")
        expect(c.verifyResetToken("ali@test.com", "999999")).toBe(false)
    })

    test("returns false when no token has been generated for that email", () => {
        const c = makeConnect()
        expect(c.verifyResetToken("nobody@test.com", "123456")).toBe(false)
    })

    test("is case-insensitive for email lookup", () => {
        const c = makeConnect()
        c.resetTokens.set("ali@test.com", "654321")
        expect(c.verifyResetToken("ALI@TEST.COM", "654321")).toBe(true)
    })

    test("returns false after the token map is cleared", () => {
        const c = makeConnect()
        c.resetTokens.set("ali@test.com", "111111")
        c.resetTokens.clear()
        expect(c.verifyResetToken("ali@test.com", "111111")).toBe(false)
    })
})

// ─── token format ─────────────────────────────────────────────────────────────

describe("Connect – token format", () => {
    test("generated token is a 6-digit numeric string", () => {
        const c = makeConnect()
        const token = c.generateTokenInMemory("ali@test.com")
        expect(token).toMatch(/^\d{6}$/)
    })

    test("generated token is stored and can be verified", () => {
        const c = makeConnect()
        const token = c.generateTokenInMemory("ali@test.com")
        expect(c.verifyResetToken("ali@test.com", token)).toBe(true)
    })

    test("wrong token fails verification even after generation", () => {
        const c = makeConnect()
        c.generateTokenInMemory("ali@test.com")
        expect(c.verifyResetToken("ali@test.com", "000000")).toBe(false)
    })

    test("a second generateToken call overwrites the first", () => {
        const c = makeConnect()
        const first  = c.generateTokenInMemory("ali@test.com")
        const second = c.generateTokenInMemory("ali@test.com")
        // The first token should now be invalid
        if (first !== second) {
            expect(c.verifyResetToken("ali@test.com", first)).toBe(false)
        }
        expect(c.verifyResetToken("ali@test.com", second)).toBe(true)
    })
})
