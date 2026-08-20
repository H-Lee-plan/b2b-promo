const express = require('express');
const { USER_ROLE } = require('../../../domain/enums');

function createEntriesRoutes(entriesController, authMiddleware) {
  const router = express.Router({ mergeParams: true });

  router.post('/', authMiddleware.optionalAuth, entriesController.createEntry);
  router.get(
    '/',
    authMiddleware.requireAuth,
    authMiddleware.requireRole(USER_ROLE.ADMIN),
    entriesController.listEntries
  );

  router.patch(
    '/:entryId/consent-note',
    authMiddleware.requireAuth,
    authMiddleware.requireRole(USER_ROLE.ADMIN),
    entriesController.updateConsentNote
  );

  router.get(
    '/export',
    authMiddleware.requireAuth,
    authMiddleware.requireRole(USER_ROLE.ADMIN),
    entriesController.exportEntriesCsv
  );

  return router;
}

module.exports = { createEntriesRoutes };
