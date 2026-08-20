function createEntriesController({
  createEntryUseCase,
  listEntriesUseCase,
  updateConsentNoteUseCase,
  exportEntriesCsvUseCase,
}) {
  async function createEntry(req, res, next) {
    try {
      const body = req.body || {};
      const entry = await createEntryUseCase.execute({
        eventId: req.params.eventId,
        member: req.member || null,
        consent: body.consent,
        guestEmail: body.guestEmail,
        guestPhone: body.guestPhone,
        guestInfo: body.guestInfo,
        formData: body.formData,
        userAgent: req.headers['user-agent'] || null,
      });
      res.status(201).json(entry.toJSON());
    } catch (err) {
      next(err);
    }
  }

  async function listEntries(req, res, next) {
    try {
      const entries = await listEntriesUseCase.execute(req.params.eventId);
      res.status(200).json(entries.map((entry) => entry.toJSON()));
    } catch (err) {
      next(err);
    }
  }

  async function updateConsentNote(req, res, next) {
    try {
      const entry = await updateConsentNoteUseCase.execute(req.params.entryId, req.body?.consentNote);
      res.status(200).json(entry.toJSON());
    } catch (err) {
      next(err);
    }
  }

  async function exportEntriesCsv(req, res, next) {
    try {
      const csv = await exportEntriesCsvUseCase.execute(req.params.eventId);
      res
        .status(200)
        .set('Content-Type', 'text/csv; charset=utf-8')
        .set('Content-Disposition', `attachment; filename="entries-${req.params.eventId}.csv"`)
        .send(csv);
    } catch (err) {
      next(err);
    }
  }

  return { createEntry, listEntries, updateConsentNote, exportEntriesCsv };
}

module.exports = { createEntriesController };
