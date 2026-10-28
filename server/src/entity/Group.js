/**
 * A group of users who share expenses (e.g. "Goa Trip").
 */
export class Group {
  constructor(name) {
    this.id = null;
    this.name = name;
    // Owning side of User <-> Group many-to-many
    this.members = new Set();
  }

  // Helper that keeps both sides of the relationship in sync
  addMember(user) {
    this.members.add(user);
    user.groups.add(this);
  }

  // Used to check membership by id
  hasMember(userId) {
    return [...this.members].some((u) => u.id === userId);
  }

  toJSON() {
    return { id: this.id, name: this.name, members: [...this.members] };
  }
}
