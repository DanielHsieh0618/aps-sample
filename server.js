const express = require('express');
const timeout = require('connect-timeout'); //express v4

const { PORT } = require('./config.js');

let app = express();
app.use(timeout(120000));

app.use(haltOnTimedout);
app.use(express.static('wwwroot'));
app.use(require('./routes/auth.js'));
app.use(require('./routes/models.js'));
app.listen(PORT, function () { console.log(`Server listening on port ${PORT}...`); });app.use(haltOnTimedout);

function haltOnTimedout(req, res, next){
  if (!req.timedout) next();
}