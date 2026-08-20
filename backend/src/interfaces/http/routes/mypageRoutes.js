const express = require('express');

function createMypageRoutes(mypageController, authMiddleware) {
  const router = express.Router();

  router.use(authMiddleware.requireAuth);

  router.get('/entries', mypageController.listMyEntries);
  router.post('/entries/:entryId/cancel', mypageController.cancelEntry);
  router.get('/profile', mypageController.getProfile);
  router.patch('/profile', mypageController.updateProfile);
  router.patch('/password', mypageController.changePassword);

  return router;
}

module.exports = { createMypageRoutes };
