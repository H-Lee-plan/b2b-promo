const bcrypt = require('bcrypt');

const PasswordHasher = require('../../application/ports/PasswordHasher');

const SALT_ROUNDS = 10;

class BcryptPasswordHasher extends PasswordHasher {
  hash(plain) {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  compare(plain, hash) {
    return bcrypt.compare(plain, hash);
  }
}

module.exports = BcryptPasswordHasher;
