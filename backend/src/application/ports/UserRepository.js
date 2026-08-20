class UserRepository {
  findByEmail(_email) {
    throw new Error('Not implemented');
  }

  findById(_id) {
    throw new Error('Not implemented');
  }

  createMember(_data) {
    throw new Error('Not implemented');
  }

  updateProfile(_id, _data) {
    throw new Error('Not implemented');
  }

  updatePasswordHash(_id, _passwordHash) {
    throw new Error('Not implemented');
  }
}

module.exports = UserRepository;
