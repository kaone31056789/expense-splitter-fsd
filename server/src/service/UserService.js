import { User } from '../entity/User.js';
import { IllegalArgumentException, UserInUseException, UserNotFoundException } from '../exception/errors.js';
import {
  expenseRepository, expenseShareRepository, paymentRepository, userRepository
} from '../repository/repositories.js';
import { transactional } from '../repository/Repository.js';

export const userService = {
  createUser({ name, email }) {
    if (name == null || name.trim() === '') {
      throw new IllegalArgumentException('Name is required');
    }
    if (email == null || !email.includes('@')) {
      throw new IllegalArgumentException('A valid email is required');
    }
    const cleanEmail = email.trim().toLowerCase();
    if (userRepository.existsByEmail(cleanEmail)) {
      throw new IllegalArgumentException(`Email already registered: ${cleanEmail}`);
    }
    return userRepository.save(new User(name.trim(), cleanEmail));
  },

  getAllUsers() {
    return userRepository.findAll();
  },

  getUser(id) {
    const user = userRepository.findById(id);
    if (!user) throw new UserNotFoundException(id);
    return user;
  },

  /**
   * Deletes a user and removes them from all their groups.
   * Refused (409) if the user paid for or shares in any expense, or is part of a payment, because deleting
   * those expenses would silently change everyone else's balances.
   */
  deleteUser(id) {
    return transactional(() => {
      const user = this.getUser(id);

      const involved = expenseRepository.countByPaidById(id) + expenseShareRepository.countByUserId(id)
        + paymentRepository.countByFromUserIdOrToUserId(id, id);
      if (involved > 0) {
        throw new UserInUseException(`${user.name} is still part of expenses or payments. `
          + 'Delete those (or the whole group) first.');
      }

      // Remove the user from every group's member list (both sides of the many-to-many)
      for (const group of [...user.groups]) {
        group.members.delete(user);
      }
      user.groups.clear();
      userRepository.delete(user);
    });
  }
};
