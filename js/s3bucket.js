const albumBucketName = "mercue.angular.test";
const bucketRegion = "ap-northeast-1";
const IdentityPoolId = "ap-northeast-1:e19bfdc9-ee06-4f19-8cf8-64b20a090444";

let imgFile;

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

function addFile(file, folderName, type) {
    const isUploadRemote = type === 'remoteVideo';
    const isUploadScreenshot = type === 'screenshot';

    if (!isUploadScreenshot) {
        startLoading('影像檔上傳中...');
    }

    imgFile = file;
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
            if (isUploadRemote) {
                closeLoading();
            }

            showMsg('success', isUploadScreenshot ? '成功上傳截圖。' : `成功上傳${fileName}影音檔。`);
        },
        function (err) {
            console.log(err);
            closeLoading();

            showMsg('alert', '上傳發生問題，將下載檔案至本地。');

            // return alert("There was an error uploading your file: ", err.message);
            const image = new Blob([imgFile], { 'type': 'image/jpeg' });
            const url = URL.createObjectURL(image);
            const downloadLink = document.createElement('a');
            downloadLink.href = url; // url
            downloadLink.download = fileName; // 檔名
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }
    );
}
