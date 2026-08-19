const express = require('express');
const eventsHandlers = require('../handlers/eventsHandlers');
const entriesRoutes = require('./entriesRoutes');
const { requireAuth, requireRole } = require('../middleware/auth');
const { USER_ROLE } = require('../shared/enums');

const router = express.Router();

router.get('/', eventsHandlers.listEvents);
router.get('/:eventId', eventsHandlers.getEvent);
router.post('/', requireAuth, requireRole(USER_ROLE.ADMIN), eventsHandlers.createEvent);
router.patch('/:eventId', requireAuth, requireRole(USER_ROLE.ADMIN), eventsHandlers.updateEvent);
router.post('/:eventId/close', requireAuth, requireRole(USER_ROLE.ADMIN), eventsHandlers.closeEvent);
router.use('/:eventId/entries', entriesRoutes);

module.exports = router;
