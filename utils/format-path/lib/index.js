"use strict";

const path = require("path");

module.exports = formatPath;

function formatPath(p) {
  if (p && typeof p === "string") {
    // sep => separate 分隔符 在macOS 返回的是一个斜杠 /, windows 下返回反斜杠 \
    const sep = path.sep;
    if (sep === "/") {
      return p;
    } else {
      return p.replace(/\\/g, "/");
    }
  }
  return p;
}
