#! /usr/bin/env node

const importLocal = require('import-local');

// 通过拼接package.json 文件中的name 与 相对目录名 bin 得出 @kev-cli/core/bin ,然后在本地node_modules文件中寻找，如果有就加载执行
if (importLocal(__dirname)) {
    require('npmlog').info('cli', '正在使用 kev-cli 本地版本');
} else {
    require('../lib')(process.argv.slice(2));
}
