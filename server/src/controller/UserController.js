import { Router } from 'express';
import { readString, requireBody } from '../dto/requests.js';
import { methodNotAllowed } from '../exception/GlobalExceptionHandler.js';
import { userService } from '../service/UserService.js';
import { idParams } from './params.js';

export const userController = Router({ strict: true });
idParams(userController, 'userId');

userController.route('/users')
  // POST /api/users   body: {"name": "Aman", "email": "aman@mail.com"}  -> 201 Created
  .post((req, res) => {
    const body = requireBody(req);
    const user = userService.createUser({ name: readString(body.name), email: readString(body.email) });
    res.status(201).json(user);
  })
  // GET /api/users -> 200 OK
  .get((req, res) => {
    res.json(userService.getAllUsers());
  })
  .all(methodNotAllowed('GET', 'POST'));

userController.route('/users/:userId')
  // GET /api/users/1 -> 200 OK or 404
  .get((req, res) => {
    res.json(userService.getUser(req.params.userId));
  })
  // DELETE /api/users/1 -> 204 No Content, 404 if missing, 409 if still in expenses
  .delete((req, res) => {
    userService.deleteUser(req.params.userId);
    res.status(204).end();
  })
  .all(methodNotAllowed('GET', 'DELETE'));
