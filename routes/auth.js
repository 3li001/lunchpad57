const route = require("@lib/createRoute")("/auth")
const { sendEmail } = require("../lib/emailService.js");
const connect = require("../dbConnect.js");

route.router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "Missing fields."
        });
    }
    
    try {
        const exists = await connect.checkUserExists(name, email);

        if (!exists.success) {
            return res.status(409).json({
                message: exists.message
            });
        }

        const result = await connect.addUser(name, email, password);
        if (!result.success) {
            return res.status(500).json({
                message: result.message
            });
        }

        return res.status(201).json({
            message: "Account created."
        });
    } 
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "There was a problem creating your account."
        });
    }
});

route.router.post("/login", async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." })
    }

    try {
        let login = await connect.checkLoginInfo(email, password);

        console.log(login);
        
        // storing the users session info
        if (login) {
            req.session.user_id = await connect.getUserID(email);
            res.json({ message: "Logged in!" })
        }
        else {
            res.status(401).json({ message: "Invalid email or password." })
        }
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
        const token = await connect.generateResetToken(email);
        if (!token) {
            return res.status(404).json({ message: "No account found" });
        }
        await sendEmail(email, "Password Reset", `Your code: ${token}`);
        res.json({
            message: "Check your email outbox for the code",
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

route.router.post("/reset-password", async (req, res) => {
    const { email, token, password, confirmPassword } = req.body;

    if (!email || !token || !password || !confirmPassword) {
        return res.status(400).json({ message: "All fields are required." });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match!" });
    }

    // 1. Validate the code from memory map
    const isValidToken = connect.verifyResetToken(email, token);
    if (!isValidToken) {
        return res.status(400).json({ message: "Invalid or expired verification code." });
    }
    
    try {
        // 2. Import your password hash utility from the ROOT folder
        const passwordHashLib = require("../passwordHash.js");
        
        // 3. Generate a fresh 32-character random salt
        const newSalt = await passwordHashLib.saltGen();
        
        // 4. Pass the salt first, plainText password second
        const pass_hash = await passwordHashLib.passwordHash(newSalt, password);

        // 5. Update the SQLite row inside test.db
        const success = await connect.resetUserPasswordWithToken(email, pass_hash, newSalt);
        if (success) {
            return res.json({ message: "Password updated successfully!" });
        } else {
            return res.status(500).json({ message: "Failed to update database record." });
        }
    } catch (err) {
        console.error("Error inside reset-password catch block:", err);
        return res.status(500).json({ message: "Error hashing password structure." });
    }
});



module.exports = route