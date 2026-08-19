const express = require('express');
const authHandlers = require('../handlers/authHandlers');

const router = express.Router();

router.post('/signup', authHandlers.signup);
router.post('/login', authHandlers.login);
router.post('/refresh', authHandlers.refresh);
router.post('/logout', authHandlers.logout);

module.exports = router;
