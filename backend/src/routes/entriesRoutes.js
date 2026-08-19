const express = require('express');
const entriesHandlers = require('../handlers/entriesHandlers');

const router = express.Router({ mergeParams: true });

router.post('/', entriesHandlers.createEntry);

module.exports = router;
