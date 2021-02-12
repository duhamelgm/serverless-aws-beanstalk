"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _fs = _interopRequireDefault(require("fs"));

var _archiver = _interopRequireDefault(require("archiver"));

var zipDirectory = function zipDirectory(source, out) {
  var archive = (0, _archiver["default"])("zip", {
    zlib: {
      level: 9
    }
  });

  var stream = _fs["default"].createWriteStream(out);

  return new Promise(function (resolve, reject) {
    archive.directory(source, false).on("error", function (err) {
      return reject(err);
    }).pipe(stream);
    stream.on("close", function () {
      return resolve();
    });
    archive.finalize();
  });
};
//# sourceMappingURL=files.js.map