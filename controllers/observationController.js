/**
 * Main Observation Controller
 * Re-exports all observation-related controllers.
 */

const formController = require('./observation/formController');
const observationController = require('./observation/observationController');
const actionController = require('./observation/actionController');
const vendorController = require('./observation/vendorController');
const issueController = require('./observation/issueController');

module.exports = {
    ...formController,
    ...observationController,
    ...actionController,
    ...vendorController,
    ...issueController,
};