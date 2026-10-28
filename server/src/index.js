import app from './app.js';

// Entry point: start the HTTP server
const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, () => {
  console.log(`Expense Splitter API running on http://localhost:${PORT}`);
});
