// Mock dbConnect before requiring middleware so no real DB connection is made
jest.mock("../dbConnect", () => ({
    getDriver: jest.fn()
}))

const connect = require("../dbConnect")
const { requireDriver } = require("../lib/middleware")

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeReq(sessionOverride = {}) {
    return { session: { user_id: { userID: 1 }, ...sessionOverride } }
}

function makeRes() {
    const res = {}
    res.redirect = jest.fn(() => res)
    return res
}

// ─── requireDriver ────────────────────────────────────────────────────────────

describe("requireDriver middleware", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    test("calls next() when the user is a registered driver", async () => {
        connect.getDriver.mockResolvedValue({ driverID: 10, userID: 1 })
        const req  = makeReq()
        const res  = makeRes()
        const next = jest.fn()

        await requireDriver(req, res, next)

        expect(next).toHaveBeenCalledTimes(1)
        expect(res.redirect).not.toHaveBeenCalled()
    })

    test("attaches the driver object to req when passing through", async () => {
        const fakeDriver = { driverID: 10, userID: 1, numberPlate: "AB12 CDE" }
        connect.getDriver.mockResolvedValue(fakeDriver)
        const req  = makeReq()
        const res  = makeRes()
        const next = jest.fn()

        await requireDriver(req, res, next)

        expect(req.driver).toEqual(fakeDriver)
    })

    test("redirects to /account when user has no driver record", async () => {
        connect.getDriver.mockResolvedValue(null)
        const req  = makeReq()
        const res  = makeRes()
        const next = jest.fn()

        await requireDriver(req, res, next)

        expect(res.redirect).toHaveBeenCalledWith("/account")
        expect(next).not.toHaveBeenCalled()
    })

    test("redirects to /account when getDriver returns undefined", async () => {
        connect.getDriver.mockResolvedValue(undefined)
        const req  = makeReq()
        const res  = makeRes()
        const next = jest.fn()

        await requireDriver(req, res, next)

        expect(res.redirect).toHaveBeenCalledWith("/account")
        expect(next).not.toHaveBeenCalled()
    })

    test("redirects to /login when there is no session at all", async () => {
        const req  = { session: {} }   // no user_id
        const res  = makeRes()
        const next = jest.fn()

        await requireDriver(req, res, next)

        expect(res.redirect).toHaveBeenCalledWith("/login")
        expect(next).not.toHaveBeenCalled()
        expect(connect.getDriver).not.toHaveBeenCalled()
    })

    test("redirects to /login when session.user_id has no userID", async () => {
        const req  = { session: { user_id: {} } }
        const res  = makeRes()
        const next = jest.fn()

        await requireDriver(req, res, next)

        expect(res.redirect).toHaveBeenCalledWith("/login")
        expect(next).not.toHaveBeenCalled()
    })

    test("does not call getDriver when user is not logged in", async () => {
        const req  = { session: {} }
        const res  = makeRes()
        const next = jest.fn()

        await requireDriver(req, res, next)

        expect(connect.getDriver).not.toHaveBeenCalled()
    })

    test("calls getDriver with the correct userID from session", async () => {
        connect.getDriver.mockResolvedValue({ driverID: 5, userID: 42 })
        const req  = { session: { user_id: { userID: 42 } } }
        const res  = makeRes()
        const next = jest.fn()

        await requireDriver(req, res, next)

        expect(connect.getDriver).toHaveBeenCalledWith(42)
    })
})
