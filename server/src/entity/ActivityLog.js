import { now } from './now.js';

/**
 * Audit trail entry written by the AuditLogger observer.
 * Example message: "Aman added expense 'Dinner' of Rs 1200.00"
 */
export class ActivityLog {
  constructor(groupId, message) {
    this.id = null;
    // Plain id (not a relation) so logs survive even if the expense is deleted
    this.groupId = groupId;
    this.message = message;
    this.createdAt = now();
  }
}
