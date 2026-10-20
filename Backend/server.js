const dns = require("dns");

dns.setServers(["8.8.8.8"]);

require("dotenv").config()
const app = require("./src/app.js");

if (require.main === module) {
    app.listen(process.env.PORT || 3000, () => {
        console.log(`server is running on port ${process.env.PORT || 3000}`);
    });
}

module.exports = app;