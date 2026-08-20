class PasswordHasher {
  hash(_plain) {
    throw new Error('Not implemented');
  }

  compare(_plain, _hash) {
    throw new Error('Not implemented');
  }
}

module.exports = PasswordHasher;
