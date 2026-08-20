function createEventsController({
  listEventsUseCase,
  getEventUseCase,
  createEventUseCase,
  updateEventUseCase,
  closeEventUseCase,
  deleteEventUseCase,
}) {
  async function listEvents(req, res, next) {
    try {
      const events = await listEventsUseCase.execute();
      res.status(200).json(events.map((event) => event.toJSON()));
    } catch (err) {
      next(err);
    }
  }

  async function getEvent(req, res, next) {
    try {
      const event = await getEventUseCase.execute(req.params.eventId);
      res.status(200).json(event.toJSON());
    } catch (err) {
      next(err);
    }
  }

  async function createEvent(req, res, next) {
    try {
      const event = await createEventUseCase.execute(req.body || {});
      res.status(201).json(event.toJSON());
    } catch (err) {
      next(err);
    }
  }

  async function updateEvent(req, res, next) {
    try {
      const event = await updateEventUseCase.execute(req.params.eventId, req.body || {});
      res.status(200).json(event.toJSON());
    } catch (err) {
      next(err);
    }
  }

  async function closeEvent(req, res, next) {
    try {
      const event = await closeEventUseCase.execute(req.params.eventId);
      res.status(200).json(event.toJSON());
    } catch (err) {
      next(err);
    }
  }

  async function deleteEvent(req, res, next) {
    try {
      await deleteEventUseCase.execute(req.params.eventId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }

  return { listEvents, getEvent, createEvent, updateEvent, closeEvent, deleteEvent };
}

module.exports = { createEventsController };
