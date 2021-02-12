"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _bluebird = _interopRequireDefault(require("bluebird"));

var _path = _interopRequireDefault(require("path"));

var _fs = _interopRequireDefault(require("fs"));

var _aws = require("./aws");

var _files = require("./files");

module.exports = /*#__PURE__*/function () {
  function Plugin(serverless, options) {
    var _this = this;

    (0, _classCallCheck2["default"])(this, Plugin);
    this.serverless = serverless;
    this.options = options;
    this.servicePath = this.serverless.config.servicePath;
    this.logger = this.serverless.cli;
    this.service = this.serverless.service;
    this.provider = this.serverless.getProvider("aws");
    this.tmpDir = _path["default"].join(this.servicePath, "/.serverless");
    this.artifactTmpDir = _path["default"].join(this.tmpDir, "./artifacts");

    if (this.service.custom) {
      this.config = this.service.custom["elastic-beanstalk"];
    }

    this.getS3Instance = _aws.getS3Instance;
    this.getElasticBeanstalkInstance = _aws.getElasticBeanstalkInstance;
    this.hooks = {
      "after:deploy:deploy": function afterDeployDeploy() {
        return _bluebird["default"].bind(_this).then(function () {
          return _this.init();
        });
      },
      "before:remove:remove": function beforeRemoveRemove() {
        return _bluebird["default"].bind(_this).then(function () {
          return _this.remove();
        });
      }
    };
  }

  (0, _createClass2["default"])(Plugin, [{
    key: "init",
    value: function () {
      var _init = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2() {
        var _this2 = this;

        var res, stack, output, config, version;
        return _regenerator["default"].wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return this.provider.request("CloudFormation", "describeStacks", {
                  StackName: "".concat(this.service.getServiceName(), "-").concat(this.provider.getStage())
                }, this.provider.getStage(), this.provider.getRegion());

              case 2:
                res = _context2.sent;
                stack = res.Stacks.pop() || {
                  Outputs: []
                };
                output = stack.Outputs || [];
                config = output.reduce(function (obj, item) {
                  return Object.assign(obj, (0, _defineProperty2["default"])({}, item.OutputKey, item.OutputValue));
                }, {});

                if (!_fs["default"].existsSync(this.artifactTmpDir)) {
                  _fs["default"].mkdirSync(this.artifactTmpDir);
                }

                version = Math.floor(new Date().valueOf() / 1000).toString();
                this.config.forEach( /*#__PURE__*/function () {
                  var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(item) {
                    var applicationName, environmentName, versionLabel, fileName, bundlePath, S3, EB, updated, response, _response;

                    return _regenerator["default"].wrap(function _callee$(_context) {
                      while (1) {
                        switch (_context.prev = _context.next) {
                          case 0:
                            applicationName = config[item.applicationName];
                            environmentName = config[item.environmentName];
                            versionLabel = "".concat(applicationName, "-").concat(version);
                            fileName = "bundle-".concat(versionLabel, ".zip");
                            _context.next = 6;
                            return (0, _files.zipDirectory)(_path["default"].join(process.cwd(), item.rootDir), "".concat(_this2.artifactTmpDir, "/").concat(fileName));

                          case 6:
                            bundlePath = _path["default"].resolve(_this2.artifactTmpDir, fileName);
                            S3 = (0, _aws.getS3Instance)(_this2.serverless, _this2.options.region);
                            _context.next = 10;
                            return S3.upload({
                              Body: _fs["default"].createReadStream(bundlePath),
                              Bucket: config.ServerlessDeploymentBucketName,
                              Key: "eb/" + fileName
                            }).promise();

                          case 10:
                            EB = (0, _aws.getElasticBeanstalkInstance)(_this2.serverless, _this2.options.region);
                            _context.next = 13;
                            return EB.createApplicationVersion({
                              ApplicationName: applicationName,
                              Process: true,
                              SourceBundle: {
                                S3Bucket: config.ServerlessDeploymentBucketName,
                                S3Key: "eb/" + fileName
                              },
                              VersionLabel: versionLabel
                            }).promise();

                          case 13:
                            _this2.logger.log("Waiting for application version...");

                            updated = false;

                          case 15:
                            if (updated) {
                              _context.next = 32;
                              break;
                            }

                            _context.next = 18;
                            return EB.describeApplicationVersions({
                              VersionLabels: [versionLabel]
                            }).promise();

                          case 18:
                            response = _context.sent;

                            _this2.logger.log(JSON.stringify(response));

                            if (!(response.ApplicationVersions[0].Status === "PROCESSED")) {
                              _context.next = 24;
                              break;
                            }

                            updated = true;
                            _context.next = 30;
                            break;

                          case 24:
                            if (!(response.ApplicationVersions[0].Status === "FAILED")) {
                              _context.next = 28;
                              break;
                            }

                            throw new Error("Creating Application Version Failed");

                          case 28:
                            _context.next = 30;
                            return _bluebird["default"].delay(5000);

                          case 30:
                            _context.next = 15;
                            break;

                          case 32:
                            _this2.logger.log("New Application Version Created Successfully");

                            _this2.logger.log("Updating Application Environment...");

                            _context.t0 = _this2.logger;
                            _context.t1 = JSON;
                            _context.next = 38;
                            return EB.updateEnvironment({
                              ApplicationName: applicationName,
                              EnvironmentName: environmentName,
                              VersionLabel: versionLabel
                            }).promise();

                          case 38:
                            _context.t2 = _context.sent;
                            _context.t3 = _context.t1.stringify.call(_context.t1, _context.t2);

                            _context.t0.log.call(_context.t0, _context.t3);

                            _this2.logger.log("Waiting for environment...");

                            updated = false;

                          case 43:
                            if (updated) {
                              _context.next = 56;
                              break;
                            }

                            _context.next = 46;
                            return EB.describeEnvironments({
                              EnvironmentNames: [environmentName]
                            }).promise();

                          case 46:
                            _response = _context.sent;

                            _this2.logger.log(JSON.stringify(_response));

                            if (!(_response.Environments[0].Status === "Ready")) {
                              _context.next = 52;
                              break;
                            }

                            updated = true;
                            _context.next = 54;
                            break;

                          case 52:
                            _context.next = 54;
                            return _bluebird["default"].delay(5000);

                          case 54:
                            _context.next = 43;
                            break;

                          case 56:
                            _this2.logger.log("Application Environment Updated Successfully");

                            _this2.logger.log("Application Deployed Successfully");

                          case 58:
                          case "end":
                            return _context.stop();
                        }
                      }
                    }, _callee);
                  }));

                  return function (_x) {
                    return _ref.apply(this, arguments);
                  };
                }());

              case 9:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function init() {
        return _init.apply(this, arguments);
      }

      return init;
    }()
  }, {
    key: "remove",
    value: function () {
      var _remove = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3() {
        var res, stack, output, config, S3;
        return _regenerator["default"].wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.next = 2;
                return this.provider.request("CloudFormation", "describeStacks", {
                  StackName: "".concat(this.service.getServiceName(), "-").concat(this.provider.getStage())
                }, this.provider.getStage(), this.provider.getRegion());

              case 2:
                res = _context3.sent;
                stack = res.Stacks.pop() || {
                  Outputs: []
                };
                output = stack.Outputs || [];
                config = output.reduce(function (obj, item) {
                  return Object.assign(obj, (0, _defineProperty2["default"])({}, item.OutputKey, item.OutputValue));
                }, {});
                S3 = (0, _aws.getS3Instance)(this.serverless, this.options.region);
                (0, _aws.emptyS3Directory)(S3, config.ServerlessDeploymentBucketName, "eb/");

              case 8:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function remove() {
        return _remove.apply(this, arguments);
      }

      return remove;
    }()
  }]);
  return Plugin;
}();
//# sourceMappingURL=index.js.map