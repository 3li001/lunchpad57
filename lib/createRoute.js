const express = require("express")

module.exports = function(path) {
    return {
        route_path: path,
        router: express.Router()
    }
}