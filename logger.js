const {createLogger, format, transports} = require('winston')

const logger = createLogger({
    level: 'debug',
    transports: [
        new transports.File({filename: 'server.log', format: format.simple()}),
        new transports.Console({format: format.simple()})
    ]
})

const stream = {
    write: message => {
        logger.info(message)
    }
}

module.exports = {logger, stream}