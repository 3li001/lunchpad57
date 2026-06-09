const { User } = require("../models/User")

describe("User model", () => {
    let user

    beforeEach(() => {
        user = User.Parse({
            id: 1,
            name: "Ali",
            email: "ali@test.com",
            password: "hashed_password"
        })
    })

    test("getId returns the correct id", () => {
        expect(user.getId()).toBe(1)
    })

    test("getName returns the correct name", () => {
        expect(user.getName()).toBe("Ali")
    })

    test("getEmail returns the correct email", () => {
        expect(user.getEmail()).toBe("ali@test.com")
    })

    test("getPassword returns the hashed password", () => {
        expect(user.getPassword()).toBe("hashed_password")
    })

    test("setField updates name", () => {
        user.setField("name", "Bob")
        expect(user.getName()).toBe("Bob")
    })

    test("setField updates email", () => {
        user.setField("email", "bob@test.com")
        expect(user.getEmail()).toBe("bob@test.com")
    })

    test("setField updates password", () => {
        user.setField("password", "new_hash")
        expect(user.getPassword()).toBe("new_hash")
    })

    test("setField ignores unknown fields", () => {
        user.setField("role", "admin")
        expect(user.getName()).toBe("Ali")
        expect(user.getEmail()).toBe("ali@test.com")
    })

    test("Serialize returns the correct shape", () => {
        expect(user.Serialize()).toEqual({
            id: 1,
            name: "Ali",
            email: "ali@test.com",
            password: "hashed_password"
        })
    })

    test("Parse with missing fields leaves them undefined", () => {
        const partial = User.Parse({ id: 5 })
        expect(partial.getId()).toBe(5)
        expect(partial.getName()).toBeUndefined()
        expect(partial.getEmail()).toBeUndefined()
    })
})
