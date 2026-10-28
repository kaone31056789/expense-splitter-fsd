import express from 'express';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expenseController } from './controller/ExpenseController.js';
import { groupController } from './controller/GroupController.js';
import { paymentController } from './controller/PaymentController.js';
import { userController } from './controller/UserController.js';
import { globalExceptionHandler, noEndpoint } from './exception/GlobalExceptionHandler.js';

/**
 * Builds the Express app: JSON parsing, the REST controllers under /api,
 * clean JSON errors, and (if it has been built) the React frontend.
 */
export function createApp() {
  const app = express();
  app.use(express.json());

  app.use('/api', userController, groupController, expenseController, paymentController);
  app.use('/api', noEndpoint);

  // Serve the built React app (client/dist) from the same server, like Spring Boot's static/ folder
  const clientDist = join(dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => res.sendFile(join(clientDist, 'index.html')));
  }

  app.use(globalExceptionHandler);
  return app;
}

export default createApp();
