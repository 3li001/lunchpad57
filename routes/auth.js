const route = require("@lib/createRoute")("/auth")
const { getDatabase } = require("../lib/devDatabase")
const bcrypt = require("bcryptjs")

// Could maybe put together an auth config with this
const SALT_ROUNDS = 10

route.router.post("/register", async (req, res) => {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
        return res.status(400).json({ message: "Missing fields." })
    }

    try {
        const user = await getDatabase().getUserByEmail(email)
        if (user) {
            return res.status(409).json({ message: "Email in use." })
        }

        const pass_hash = await bcrypt.hash(password, SALT_ROUNDS)
        await getDatabase().addUser(name, email, pass_hash)

        res.status(201).json({ message: "Account created." })
    }
    catch (error) {
        console.error(error)
        res.status(500).json({ message: "There was a problem creating your account, try again later." })
    }
})

route.router.post("/login", async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." })
    }

    try {
        const user = await getDatabase().getUserByEmail(email)

        if (!user || !await bcrypt.compare(password, user.getPassword())) {
            return res.status(401).json({ message: "Invalid email or password." })
        }

        req.session.user_id = user.getId()

        res.json({ message: "Logged in!" })
    }
    catch (error) {
        console.error(error)
        res.status(500).json({ message: "There was a problem logging you in, try again later." })
    }
})

// We shouldn't really accept GET for logout,
// will change later but lazy rn
route.router.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/")
    })
})

route.router.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({ message: "Logged out." })
    })
})

route.exclude_auth = true

route.router.get("/forgot-password", (req, res) => {
    res.render("login");
});

route.router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        const db = getDatabase();

        const token = db.generateResetToken(email);
        if (!token) {
            return res.status(404).json({ message: "No account found" });
        }
        
        await sendEmail(email, "Password Reset", `Your code: ${token}`);
        
        res.json({
            message: "Check your email outbox for the code📧",
            redirect: `/auth/reset-password?email=${encodeURIComponent(email)}`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

route.router.get("/reset-password", (req, res) => {
    res.render("reset-password", {
        email: req.query.email,
        token: req.query.token
    });
});

route.router.post("/reset-password", (req, res) => {
    const { email, token, password, confirmPassword } = req.body;
    const db = getDatabase();

    if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match!" });
    }
    
    const pass_hash = bcrypt.hashSync(password, 10);
    const success = db.resetUserPasswordWithToken(email, token, pass_hash);
    if (success) {
        res.status(200).json({ message: "Success" });
    } 
    else {
        res.status(401).json({ message: "Invalid verification code from outbox." });
    }
});


module.exports = route