const config = require('../configs')

module.exports = {
    getList: () => config.lists(),
    getOwn: () => config.owns(),
}
