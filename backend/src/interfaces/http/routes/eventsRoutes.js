const express = require('express');
const { USER_ROLE } = require('../../../domain/enums');

function createEventsRoutes(eventsController, entriesRouter, authMiddleware) {
  const router = express.Router();

  router.get('/', eventsController.listEvents);
  router.get('/:eventId', eventsController.getEvent);
  router.post(
    '/',
    authMiddleware.requireAuth,
    authMiddleware.requireRole(USER_ROLE.ADMIN),
    eventsController.createEvent
  );
  router.patch(
    '/:eventId',
    authMiddleware.requireAuth,
    authMiddleware.requireRole(USER_ROLE.ADMIN),
    eventsController.updateEvent
  );
  router.post(
    '/:eventId/close',
    authMiddleware.requireAuth,
    authMiddleware.requireRole(USER_ROLE.ADMIN),
    eventsController.closeEvent
  );
  router.delete(
    '/:eventId',
    authMiddleware.requireAuth,
    authMiddleware.requireRole(USER_ROLE.ADMIN),
    eventsController.deleteEvent
  );
  router.use('/:eventId/entries', entriesRouter);

  return router;
}

module.exports = { createEventsRoutes };
