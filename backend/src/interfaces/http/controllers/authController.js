function createAuthController({ signupUseCase, loginUseCase, refreshTokenUseCase, logoutUseCase }) {
  async function signup(req, res, next) {
    try {
      const user = await signupUseCase.execute(req.body || {});
      res.status(201).json(user.toPublicJSON());
    } catch (err) {
      next(err);
    }
  }

  async function login(req, res, next) {
    try {
      const { accessToken, refreshToken, user } = await loginUseCase.execute(req.body || {});
      res.status(200).json({ accessToken, refreshToken, user: user.toPublicJSON() });
    } catch (err) {
      next(err);
    }
  }

  async function refresh(req, res, next) {
    try {
      const tokens = await refreshTokenUseCase.execute(req.body || {});
      res.status(200).json(tokens);
    } catch (err) {
      next(err);
    }
  }

  async function logout(req, res, next) {
    try {
      await logoutUseCase.execute(req.body || {});
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  return { signup, login, refresh, logout };
}

module.exports = { createAuthController };
