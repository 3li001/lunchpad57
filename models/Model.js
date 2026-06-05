class Model {
    Parse(obj) {
        console.log(this)
        console.error(`${this.constructor.name} must implement Parse`)
    }

    Serialize() {
        console.log(this)
        console.error(`${this.constructor.name} must implement Serialize`)
    }
}

module.exports = { Model }