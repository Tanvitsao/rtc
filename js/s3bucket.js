const albumBucketName = "mercue.angular.test";
const bucketRegion = "ap-northeast-1";
const IdentityPoolId = "ap-northeast-1:e19bfdc9-ee06-4f19-8cf8-64b20a090444";

AWS.config.update({
    region: bucketRegion,
    credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: IdentityPoolId
    })
});

const s3 = new AWS.S3({
    apiVersion: "2012-10-17",
    params: { Bucket: albumBucketName }
});

function addFile(file, folderName) {
    var file = file;
    var fileName = file.name;
    var albumPhotosKey = encodeURIComponent(folderName) + "/";

    var photoKey = albumPhotosKey + fileName;

    // Use S3 ManagedUpload class as it supports multipart uploads
    var upload = new AWS.S3.ManagedUpload({
        params: {
            Bucket: albumBucketName,
            Key: photoKey,
            Body: file
        }
    });

    var promise = upload.promise();

    promise.then(
        function (data) {
            alert("Successfully uploaded file.");
        },
        function (err) {
            console.log(err);
            return alert("There was an error uploading your file: ", err.message);
        }
    );
}