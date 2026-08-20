class TokenService {
  issueTokenPair(_user) {
    throw new Error('Not implemented');
  }

  verifyAccessToken(_token) {
    throw new Error('Not implemented');
  }

  verifyRefreshToken(_token) {
    throw new Error('Not implemented');
  }

  hashRefreshToken(_token) {
    throw new Error('Not implemented');
  }
}

module.exports = TokenService;
