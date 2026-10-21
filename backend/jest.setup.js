// Run tests in Beijing time, the same as production (backend Dockerfile sets TZ=Asia/Shanghai).
// Must be a globalSetup: process.env inside a test sandbox does not change the process time zone.
module.exports = async () => {
  process.env.TZ = 'Asia/Shanghai';
};
