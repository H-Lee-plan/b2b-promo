function createMypageController({
  listMyEntriesUseCase,
  getProfileUseCase,
  updateProfileUseCase,
  changePasswordUseCase,
  cancelEntryUseCase,
}) {
  async function listMyEntries(req, res, next) {
    try {
      const entries = await listMyEntriesUseCase.execute(req.user.userId);
      res.status(200).json(entries.map((entry) => entry.toMypageJSON()));
    } catch (err) {
      next(err);
    }
  }

  async function getProfile(req, res, next) {
    try {
      const user = await getProfileUseCase.execute(req.user.userId);
      res.status(200).json(user.toPublicJSON());
    } catch (err) {
      next(err);
    }
  }

  async function updateProfile(req, res, next) {
    try {
      const user = await updateProfileUseCase.execute(req.user.userId, req.body || {});
      res.status(200).json(user.toPublicJSON());
    } catch (err) {
      next(err);
    }
  }

  async function changePassword(req, res, next) {
    try {
      await changePasswordUseCase.execute(req.user.userId, req.body || {});
      res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  }

  async function cancelEntry(req, res, next) {
    try {
      const entry = await cancelEntryUseCase.execute(req.user.userId, req.params.entryId);
      res.status(200).json(entry.toMypageJSON());
    } catch (err) {
      next(err);
    }
  }

  return { listMyEntries, getProfile, updateProfile, changePassword, cancelEntry };
}

module.exports = { createMypageController };
