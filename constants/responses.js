const statusCodes = require('http-status-codes');

module.exports = {
    ok: message => {
        const status = statusCodes.OK;
        let desc = 'New message';
        return { status, desc };
    },
};
