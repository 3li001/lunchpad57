const connect = require("../dbConnect")

/**
 * Middleware that only allows registered drivers through.
 * Redirects to /account if the user is not a driver.
 */
async function requireDriver(req, res, next) {
    const user_id = req.session.user_id?.userID

    if (!user_id) {
        return res.redirect("/login")
    }

    const driver = await connect.getDriver(user_id)

    if (!driver) {
        return res.redirect("/account")
    }

    // Attach driver to request so route handlers can use it without re-querying
    req.driver = driver
    next()
}

module.exports = { requireDriver }
