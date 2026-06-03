const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, ".env") });
const fs = require("node:fs");
const { env } = require("node:process")

require("./node_modules/module-alias/register")

const express = require("express");
const createError = require("http-errors");
const logger = require("morgan");
const session = require("express-session")

const app = express();

// Setup pug view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

/////////////////////
// Data Middleware
// This is all utility stuff that runs before any routes are called,
// so shared middleware like logging and data parsing should be defined here.
////////////////////

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// This needs to be changed for production to use a
// secret in an env file or similar, but for development we
// will just use this hardcoded string
const DEV_SESSION_SECRET = "SECRET"
app.use(session({
    secret: DEV_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    // Cookie expires after 1 day
    // Cookie is secure in production
    cookie: { secure: env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 24 }
}))

// Static resources such as CSS and front-end JS logic will be pulled from here.
// Files in a static folder will behave as root files, 
// so for example public/stylesheets/style.css would be referenced as /stylesheets/style.css
app.use(express.static(path.join(__dirname, "public")));


/////////////////////
// Routes
// We register routes automatically, but this is where you can 
// define a route if you need to handle it separately.
////////////////////

// Middleware to ensure the user is logged in before loading any pages,
// since none of the pages can be used without a user account
const requireAuth = (req, res, next) => {
    if (req.session?.user_id !== undefined) {
        return next();
    }

    res.redirect("/login");
};

app.get("/login", (req, res) => {
    res.render("login")
})

const public_routes = []
const auth_routes = []

// Register all of our routes with Express automatically,
// invalid routes will throw an error so follow the format expected!

for (const p of ["routes", "api"]) {
    const routes_path = path.join(__dirname, p);

    fs.readdirSync(routes_path).forEach((route_file) => {
        const { route_path, router, exclude_auth } = require(path.join(routes_path, route_file));
        console.log(`Route - ${route_path}`);
        if (!route_path || !router) {
            console.error(`Invalid route ${route_file}`);
            process.exit();
        }

        // console.log(route_path, router, exclude_auth)

        // We need to register unprotected routes first so 
        // they don't hit the auth middleware
        // if (exclude_auth === true ) {
            public_routes.push({ route_path, router })
        // }
        // else {
            // auth_routes.push({ route_path, router })
        // }
    })
}

public_routes.forEach(({ route_path, router }) => {
    app.use(route_path, router)
})

auth_routes.forEach(({ route_path, router }) => {
    app.use(route_path, requireAuth, router)
})

/////////////////////
// Error Handling
// If any errors happen server-side or the user tries to reach a route
// that doesn't exist it'll be handled here. This is defined after our routes
// so will only be hit if no route can be found to handle their request.
////////////////////

// Forward 404 errors to the error handler
app.use((req, res, next) => {
    next(createError(404));
});

// Render the error page if we encounter a 404, or any internal server errors
app.use((err, req, res, next) => {
    res.locals.message = err.message;

    // Include error message if in development
    res.locals.error = req.app.get("env") === "development" ? err : {};

    res.status(err.status || 500);
    res.render("error");
});


/////////////////////
// This is where the site is started, there shouldn"t be
// any modifications to `app` past this point.
////////////////////

const PORT = env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
    console.log(`Access at http://localhost:${PORT}`)
    console.log(app.get("env"))
})