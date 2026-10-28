/**
 * A person who can join groups and share expenses.
 */
export class User {
  constructor(name, email) {
    this.id = null;
    this.name = name;
    this.email = email;
    // Inverse side of the many-to-many (Group owns it). Left out of JSON to stop
    // infinite loops (user -> groups -> members -> user ...)
    this.groups = new Set();
  }

  toJSON() {
    return { id: this.id, name: this.name, email: this.email };
  }
}
