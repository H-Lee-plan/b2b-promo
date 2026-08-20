class User {
  constructor({ id, role, email, passwordHash, companyName, name, phone }) {
    this.id = id;
    this.role = role;
    this.email = email;
    this.passwordHash = passwordHash;
    this.companyName = companyName;
    this.name = name;
    this.phone = phone;
  }

  toPublicJSON() {
    return {
      id: this.id,
      role: this.role,
      email: this.email,
      companyName: this.companyName,
      name: this.name,
      phone: this.phone,
    };
  }
}

module.exports = User;
