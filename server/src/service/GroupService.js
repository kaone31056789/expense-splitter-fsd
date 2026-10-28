import { ActivityLog } from '../entity/ActivityLog.js';
import { Group } from '../entity/Group.js';
import { GroupNotFoundException, IllegalArgumentException } from '../exception/errors.js';
import {
  activityLogRepository, expenseRepository, groupRepository, paymentRepository
} from '../repository/repositories.js';
import { transactional } from '../repository/Repository.js';
import { userService } from './UserService.js';

export const groupService = {
  createGroup({ name }) {
    if (name == null || name.trim() === '') {
      throw new IllegalArgumentException('Group name is required');
    }
    const saved = groupRepository.save(new Group(name.trim()));
    activityLogRepository.save(new ActivityLog(saved.id, `Group '${saved.name}' created`));
    return saved;
  },

  getAllGroups() {
    return groupRepository.findAll();
  },

  getGroup(id) {
    const group = groupRepository.findById(id);
    if (!group) throw new GroupNotFoundException(id);
    return group;
  },

  addMember(groupId, userId) {
    const group = this.getGroup(groupId);
    const user = userService.getUser(userId);

    if (group.hasMember(userId)) {
      throw new IllegalArgumentException(`${user.name} is already a member of ${group.name}`);
    }
    group.addMember(user);
    activityLogRepository.save(new ActivityLog(groupId, `${user.name} joined the group`));
    return groupRepository.save(group);
  },

  /**
   * Deletes a group with everything inside it: expenses (and their shares),
   * settle-up payments, member links and the activity log. Users themselves are kept.
   */
  deleteGroup(groupId) {
    return transactional(() => {
      const group = this.getGroup(groupId);
      expenseRepository.deleteAll(expenseRepository.findByGroupIdOrderByCreatedAtAsc(groupId));
      paymentRepository.deleteAll(paymentRepository.findByGroupIdOrderByCreatedAtDesc(groupId));
      for (const member of group.members) {
        member.groups.delete(group);
      }
      group.members.clear();
      activityLogRepository.deleteByGroupId(groupId);
      groupRepository.delete(group);
    });
  },

  getActivity(groupId) {
    this.getGroup(groupId); // 404 if the group does not exist
    return activityLogRepository.findByGroupIdOrderByCreatedAtDesc(groupId);
  }
};
