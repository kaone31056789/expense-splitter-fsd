import { Router } from 'express';
import { readString, requireBody } from '../dto/requests.js';
import { methodNotAllowed } from '../exception/GlobalExceptionHandler.js';
import { balanceService } from '../service/BalanceService.js';
import { groupService } from '../service/GroupService.js';
import { idParams } from './params.js';

export const groupController = Router({ strict: true });
idParams(groupController, 'groupId', 'userId');

groupController.route('/groups')
  // POST /api/groups   body: {"name": "Goa Trip"} -> 201 Created
  .post((req, res) => {
    const body = requireBody(req);
    res.status(201).json(groupService.createGroup({ name: readString(body.name) }));
  })
  .get((req, res) => {
    res.json(groupService.getAllGroups());
  })
  .all(methodNotAllowed('GET', 'POST'));

groupController.route('/groups/:groupId')
  .get((req, res) => {
    res.json(groupService.getGroup(req.params.groupId));
  })
  // DELETE /api/groups/1 -> 204 No Content (also deletes its expenses and activity log)
  .delete((req, res) => {
    groupService.deleteGroup(req.params.groupId);
    res.status(204).end();
  })
  .all(methodNotAllowed('GET', 'DELETE'));

// POST /api/groups/1/members/2 -> 200 OK (returns the updated group)
groupController.route('/groups/:groupId/members/:userId')
  .post((req, res) => {
    res.json(groupService.addMember(req.params.groupId, req.params.userId));
  })
  .all(methodNotAllowed('POST'));

// GET /api/groups/1/balances -> net balance of every member
groupController.route('/groups/:groupId/balances')
  .get((req, res) => {
    res.json(balanceService.getBalances(req.params.groupId));
  })
  .all(methodNotAllowed('GET'));

// GET /api/groups/1/settlements -> minimum list of payments
groupController.route('/groups/:groupId/settlements')
  .get((req, res) => {
    res.json(balanceService.getSettlements(req.params.groupId));
  })
  .all(methodNotAllowed('GET'));

// GET /api/groups/1/activity -> audit log written by the AuditLogger observer
groupController.route('/groups/:groupId/activity')
  .get((req, res) => {
    res.json(groupService.getActivity(req.params.groupId));
  })
  .all(methodNotAllowed('GET'));
