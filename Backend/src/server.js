const http = require('http');
const app = require('./app');
const config = require('./config');
const connectDB = require('./config/database');

// Connect to Database
connectDB();

const server = http.createServer(app);

server.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});

module.exports = server;
