const express = require('express');
const { loginRateLimiter } = require('../middleware/rateLimiter');

function createAuthRoutes(authController) {
  const router = express.Router();

  router.post('/signup', authController.signup);
  router.post('/login', loginRateLimiter, authController.login);
  router.post('/refresh', authController.refresh);
  router.post('/logout', authController.logout);

  return router;
}

module.exports = { createAuthRoutes };
