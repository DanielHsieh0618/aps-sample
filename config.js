require('dotenv').config();

let { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_BUCKET, PORT } = process.env;
if (!APS_CLIENT_ID || !APS_CLIENT_SECRET) {
    console.warn('Missing some of the environment variables.');
    process.exit(1);
}
// And if no bucket name is provided for where our designs should be stored, we generate one by appending the -basic-app suffix to our application Client ID.
// caution : Note that the Data Management service requires bucket names to be globally unique, and attempts to create a bucket with an already used name will fail with 409 Conflict. See the documentation for more details.
APS_BUCKET = APS_BUCKET || `${APS_CLIENT_ID.toLowerCase()}-basic-app`;
PORT = PORT || 8080;

module.exports = {
    APS_CLIENT_ID,
    APS_CLIENT_SECRET,
    APS_BUCKET,
    PORT
};