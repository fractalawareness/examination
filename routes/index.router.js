const express = require('express');
const router = express.Router();

const exampleService = require('../services/index.service');
const RouterProvider = require('./base/base.router');

const ExampleProvider = new RouterProvider(exampleService, router);
module.exports = ExampleProvider.router;
