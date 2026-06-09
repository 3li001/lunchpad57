/**
 * Validates a UK number plate.
 * Accepts formats like "AB12CDE" or "AB12 CDE" (with optional space).
 */
function isValidPlate(plate) {
    if (typeof plate !== "string") return false
    const normalised = plate.trim().toUpperCase()
    return /^[A-Z0-9]{2,4} ?[A-Z0-9]{2,4}$/.test(normalised)
}

/**
 * Validates a vehicle year.
 */
function isValidYear(year) {
    const y = parseInt(year)
    if (isNaN(y)) return false
    const current = new Date().getFullYear()
    return y >= 1900 && y <= current + 1
}

/**
 * Validates a vehicle MPG value.
 */
function isValidMpg(mpg) {
    const m = parseInt(mpg)
    if (isNaN(m)) return false
    return m >= 1 && m <= 200
}

module.exports = { isValidPlate, isValidYear, isValidMpg }
