// Mock dbConnect and emailService before any route is loaded
jest.mock("../dbConnect", () => ({
    checkUserExists:  jest.fn(),
    addUser:          jest.fn(),
    checkLoginInfo:   jest.fn(),
    getUserID:        jest.fn(),
    generateResetToken: jest.fn(),
    verifyResetToken:   jest.fn(),
    resetUserPasswordWithToken: jest.fn(),
    getVehicleMakes:  jest.fn(),
    getVehicleModels: jest.fn(),
    getVehicleYears:  jest.fn(),
    getPlaces:        jest.fn(),
    getPlaces2:       jest.fn(),
    getCoords:        jest.fn(),
    getDriverID:      jest.fn(),
    getPlaceID:       jest.fn(),
    addCommute:       jest.fn(),
    getDriverDriverID: jest.fn(),
    getVehicleID:     jest.fn(),
    addDriver:        jest.fn(),
}))

jest.mock("../lib/emailService.js", () => ({
    sendEmail: jest.fn().mockResolvedValue(true)
}))

jest.mock("../passwordHash.js", () => ({
    saltGen:      jest.fn().mockResolvedValue("fakesalt"),
    passwordHash: jest.fn().mockResolvedValue("fakehash"),
}))

const request  = require("supertest")
const express  = require("express")
const session  = require("express-session")
const connect  = require("../dbConnect")

// Build a minimal Express app with just the auth router
function buildApp() {
    const app = express()
    app.use(express.json())
    app.use(session({ secret: "test", resave: false, saveUninitialized: false }))
    app.set("views", require("path").join(__dirname, "../views"))
    app.set("view engine", "pug")
    const { router } = require("../routes/auth")
    app.use("/auth", router)
    return app
}

let app
beforeAll(() => { app = buildApp() })
beforeEach(() => { jest.clearAllMocks() })

// ─── POST /auth/register ──────────────────────────────────────────────────────

describe("POST /auth/register", () => {
    test("returns 400 when all fields are missing", async () => {
        const res = await request(app).post("/auth/register").send({})
        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(/missing fields/i)
    })

    test("returns 400 when name is missing", async () => {
        const res = await request(app).post("/auth/register")
            .send({ email: "a@b.com", password: "pass" })
        expect(res.status).toBe(400)
    })

    test("returns 400 when email is missing", async () => {
        const res = await request(app).post("/auth/register")
            .send({ name: "Ali", password: "pass" })
        expect(res.status).toBe(400)
    })

    test("returns 400 when password is missing", async () => {
        const res = await request(app).post("/auth/register")
            .send({ name: "Ali", email: "a@b.com" })
        expect(res.status).toBe(400)
    })

    test("returns 409 when email is already in use", async () => {
        connect.checkUserExists.mockResolvedValue({ success: false, message: "User already exists" })
        const res = await request(app).post("/auth/register")
            .send({ name: "Ali", email: "taken@b.com", password: "pass" })
        expect(res.status).toBe(409)
        expect(res.body.message).toBe("User already exists")
    })

    test("returns 201 when registration succeeds", async () => {
        connect.checkUserExists.mockResolvedValue({ success: true })
        connect.addUser.mockResolvedValue({ success: true })
        const res = await request(app).post("/auth/register")
            .send({ name: "Ali", email: "new@b.com", password: "pass" })
        expect(res.status).toBe(201)
        expect(res.body.message).toMatch(/account created/i)
    })

    test("returns 500 when addUser fails", async () => {
        connect.checkUserExists.mockResolvedValue({ success: true })
        connect.addUser.mockResolvedValue({ success: false, message: "failed to add user" })
        const res = await request(app).post("/auth/register")
            .send({ name: "Ali", email: "new@b.com", password: "pass" })
        expect(res.status).toBe(500)
    })
})

// ─── POST /auth/login ─────────────────────────────────────────────────────────

describe("POST /auth/login", () => {
    test("returns 400 when email is missing", async () => {
        const res = await request(app).post("/auth/login").send({ password: "pass" })
        expect(res.status).toBe(400)
    })

    test("returns 400 when password is missing", async () => {
        const res = await request(app).post("/auth/login").send({ email: "a@b.com" })
        expect(res.status).toBe(400)
    })

    test("returns 401 when credentials are wrong", async () => {
        connect.checkLoginInfo.mockResolvedValue(false)
        const res = await request(app).post("/auth/login")
            .send({ email: "a@b.com", password: "wrong" })
        expect(res.status).toBe(401)
        expect(res.body.message).toMatch(/invalid email or password/i)
    })

    test("returns 200 and sets session when credentials are correct", async () => {
        connect.checkLoginInfo.mockResolvedValue(true)
        connect.getUserID.mockResolvedValue({ userID: 1 })
        const res = await request(app).post("/auth/login")
            .send({ email: "a@b.com", password: "correctpass" })
        expect(res.status).toBe(200)
        expect(res.body.message).toMatch(/logged in/i)
    })
})

// ─── POST /auth/reset-password ────────────────────────────────────────────────

describe("POST /auth/reset-password", () => {
    test("returns 400 when required fields are missing", async () => {
        const res = await request(app).post("/auth/reset-password").send({})
        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(/all fields are required/i)
    })

    test("returns 400 when passwords do not match", async () => {
        const res = await request(app).post("/auth/reset-password").send({
            email: "a@b.com", token: "123456",
            password: "abc", confirmPassword: "xyz"
        })
        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(/passwords do not match/i)
    })

    test("returns 400 when token is invalid", async () => {
        connect.verifyResetToken.mockReturnValue(false)
        const res = await request(app).post("/auth/reset-password").send({
            email: "a@b.com", token: "000000",
            password: "newpass", confirmPassword: "newpass"
        })
        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(/invalid or expired/i)
    })

    test("returns 200 when reset succeeds", async () => {
        connect.verifyResetToken.mockReturnValue(true)
        connect.resetUserPasswordWithToken.mockResolvedValue(true)
        const res = await request(app).post("/auth/reset-password").send({
            email: "a@b.com", token: "123456",
            password: "newpass", confirmPassword: "newpass"
        })
        expect(res.status).toBe(200)
        expect(res.body.message).toMatch(/password updated/i)
    })
})
