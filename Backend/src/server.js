const http = require('http');
const app = require('./app');
const config = require('./config');
const connectDB = require('./config/database');

// Connect to Database, then resume report jobs abandoned by a server restart.
connectDB().then(() => {
  const { recoverStaleReportGenerations } = require('./controllers/interviewController');
  const recoverReports = () => recoverStaleReportGenerations().catch(err => {
    console.error('[REPORT_RECOVERY]', err.code || err.name || 'UNKNOWN');
  });
  recoverReports();
  const recoveryTimer = setInterval(recoverReports, 60 * 1000);
  recoveryTimer.unref();
});

const server = http.createServer(app);

server.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});

module.exports = server;
