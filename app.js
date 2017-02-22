const express = require('express');
const endpoints = require('./constants/endpoints');

// Routes includes
const indexRouter = require('./routes/index.router');

const app = express();
app.set('port', 5000);
app.listen(app.get('port'), function() {
    console.log('Node app is running on http://localhost:' + app.get('port') );
});

// Routes declaration
app.use(endpoints.rootEndpoint, indexRouter);
app.use(endpoints.getSearch, indexRouter);
app.use(endpoints.getSearchList, indexRouter);

module.exports = app;