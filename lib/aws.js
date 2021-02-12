"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getElasticBeanstalkInstance = exports.emptyS3Directory = exports.getS3Instance = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

// S3 Utils
var getS3Instance = function getS3Instance(serverless, region) {
  var provider = serverless.getProvider(serverless.service.provider.name);
  return new provider.sdk.S3({
    region: region,
    apiVersion: "2006-03-01"
  });
};

exports.getS3Instance = getS3Instance;

var emptyS3Directory = /*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(s3, bucket, dir) {
    var listParams, listedObjects, deleteParams;
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            listParams = {
              Bucket: bucket,
              Prefix: dir
            };
            _context.next = 3;
            return s3.listObjectsV2(listParams).promise();

          case 3:
            listedObjects = _context.sent;

            if (!(listedObjects.Contents.length === 0)) {
              _context.next = 6;
              break;
            }

            return _context.abrupt("return");

          case 6:
            deleteParams = {
              Bucket: bucket,
              Delete: {
                Objects: []
              }
            };
            listedObjects.Contents.forEach(function (_ref2) {
              var Key = _ref2.Key;
              deleteParams.Delete.Objects.push({
                Key: Key
              });
            });
            _context.next = 10;
            return s3.deleteObjects(deleteParams).promise();

          case 10:
            if (!listedObjects.IsTruncated) {
              _context.next = 13;
              break;
            }

            _context.next = 13;
            return emptyS3Directory(bucket, dir);

          case 13:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));

  return function emptyS3Directory(_x, _x2, _x3) {
    return _ref.apply(this, arguments);
  };
}(); // EB Utils


exports.emptyS3Directory = emptyS3Directory;

var getElasticBeanstalkInstance = function getElasticBeanstalkInstance(serverless, region) {
  var provider = serverless.getProvider(serverless.service.provider.name);
  return new provider.sdk.ElasticBeanstalk({
    region: region,
    apiVersion: "2010-12-01"
  });
};

exports.getElasticBeanstalkInstance = getElasticBeanstalkInstance;
//# sourceMappingURL=aws.js.map