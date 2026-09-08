const app = require("./app");
const connectDB = require("./config/db");
const { PORT } = require("./config/env");

(async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[server] Problem2Impact API listening on http://localhost:${PORT}`);
  });
})();