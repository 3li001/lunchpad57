const { Model } = require("./Model")

class User extends Model {
    #id
    #name
    #email
    #prefs
    #password

    static Parse(obj) {
        const u = new User()
        u.#id = obj["id"]
        u.#name = obj["name"]
        u.#email = obj["email"]
        u.#password = obj["password"]
        return u
    }

    Serialize() {
        return {
            id: this.getId(),
            name: this.getName(),
            email: this.getEmail(),
            password: this.getPassword(),
        }
    }

    getId() { return this.#id }
    getName() { return this.#name }
    getEmail() { return this.#email }
    getPassword() { return this.#password }

    setField(field, value) {
        if (field === "name")     this.#name = value
        if (field === "email")    this.#email = value
        if (field === "password") this.#password = value
    }
}

module.exports = { User }