const { AuthenticationClient, Scopes } = require('@aps_sdk/authentication');
const { OssClient, Region, PolicyKey } = require('@aps_sdk/oss');
const { ModelDerivativeClient, View, OutputType } = require('@aps_sdk/model-derivative');
const { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_BUCKET } = require('../config.js');

const authenticationClient = new AuthenticationClient();
const ossClient = new OssClient();
const modelDerivativeClient = new ModelDerivativeClient();

const service = module.exports = {};

service.getViewerToken = async () => {
    return await authenticationClient.getTwoLeggedToken(APS_CLIENT_ID, APS_CLIENT_SECRET, [Scopes.ViewablesRead]);
};

async function getInternalToken() {
    const credentials = await authenticationClient.getTwoLeggedToken(APS_CLIENT_ID, APS_CLIENT_SECRET, [
        Scopes.DataRead,
        Scopes.DataCreate,
        Scopes.DataWrite,
        Scopes.BucketCreate,
        Scopes.BucketRead
    ]);
    return credentials.access_token;
}

/**
 *  BELOW IS ABOUT OBJECT STORAGE SERVICE
 */

/**
 *  info :
 *  Data Retention Policy
 *  Transient - Objects older than 24 hours are removed automatically.
 *  Temporary - When an object has reached 30 days of age, it is deleted.
 *  Persistent - Available until a user deletes the object.
 */

service.ensureBucketExists = async (bucketKey) => {
    const accessToken = await getInternalToken();
    try {
        await ossClient.getBucketDetails(bucketKey, { accessToken });
    } catch (err) {
        if (err.axiosError.response.status === 404) {
            await ossClient.createBucket(Region.Us, { bucketKey: bucketKey, policyKey: PolicyKey.Persistent }, { accessToken});
        } else {
            throw err;
        }
    }
};

// The listObjects method retrieves a list of objects stored in the bucket.
service.listObjects = async () => {
    // Ensure the bucket exists before listing objects
    await service.ensureBucketExists(APS_BUCKET);
    const accessToken = await getInternalToken();
    let res = await ossClient.getObjects(APS_BUCKET, { limit: 64, accessToken });
    let objects = res.items;
    while (res.next) {
        const startAt = new URL(res.next).searchParams.get('startAt');
        res = await ossClient.getObjects(APS_BUCKET, { limit: 64, startAt, accessToken });
        objects = objects.concat(res.items);
    }
    return objects;
};

// The getObject method retrieves a specific object from the bucket.
service.uploadObject = async (objectName, filePath) => {
    // Ensure the bucket exists before uploading objects
    await service.ensureBucketExists(APS_BUCKET);
    const accessToken = await getInternalToken();
    const obj = await ossClient.uploadObject(APS_BUCKET, objectName, filePath, { accessToken });
    return obj;
};


/**
 *  BELOW IS ABOUT MODEL DERIVATIVE SERVICE
 *  Derivatives
 *  Next, we will implement a couple of helper functions that will derive/extract various types of information from the uploaded files 
 *  - for example, 2D drawings, 3D geometry, and metadata - 
 *  that we can later load into the Viewer in our webpage. To do so, we will need to start a new conversion job in the Model Derivative service, and checking the status of the conversion.
 */

/**
 * 
 * caution
 * Please note that the translation of designs using the Model Derivative service has a cost associated with it,
 * see the Pricing page: https://aps.autodesk.com/pricing for more details. We recommend that you use a non-expired trial subscription when following this tutorial.
 * 
 */

/**
 * info:
 * Base64-encoded IDs are referred to as URNs. 
 */

// The translateObject method starts a translation job for the specified object.
service.translateObject = async (urn, rootFilename = '') => {
    const accessToken = await getInternalToken();
    const job = await modelDerivativeClient.startJob({
        input: {
            urn,
            compressedUrn: !!rootFilename,
            rootFilename
        },
        output: {
            formats: [{
                views: [View._2d, View._3d],
                type: OutputType.Svf2
            }]
        }
    }, { accessToken });
    return job.result;
};

// The getManifest method retrieves the manifest for the specified URN.
service.getManifest = async (urn) => {
    const accessToken = await getInternalToken();
    try {
        const manifest = await modelDerivativeClient.getManifest(urn, { accessToken });
        return manifest;
    } catch (err) {
        if (err.axiosError?.response.status === 404) {
            return null;
        } else {
            throw err;
        }
    }
};

// The urnify method converts an ID to a URN.
service.urnify = (id) => Buffer.from(id).toString('base64').replace(/=/g, '');

