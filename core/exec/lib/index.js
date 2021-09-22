"use strict";

const path = require("path");
const Package = require("@kev-cli/package");
const log = require("@kev-cli/log");
const { exec: spawn } = require("@kev-cli/utils");

const SETTINGS = {
  init: '@kev-cli/init',
};

const CACHE_DIR = "dependencies";

async function exec() {
  let targetPath = process.env.CLI_TARGET_PATH;
  const homePath = process.env.CLI_HOME_PATH;
  let storeDir = "";
  let pkg;
  log.verbose("targetPath", targetPath);
  log.verbose("homePath", homePath);

  // 直接在exec函数形参中获取参数的话，如果执行命令不同参数位置可能会变化，不能准确获取是哪一个参数
  const cmdObj = arguments[arguments.length - 1];
  const cmdName = cmdObj.name();
  const packageName = SETTINGS[cmdName];
  const packageVersion = "latest";

  if (!targetPath) {
    targetPath = path.resolve(homePath, CACHE_DIR); // 生成缓存路径
    storeDir = path.resolve(targetPath, "node_modules");
    log.verbose("targetPath", targetPath);
    log.verbose("storeDir", storeDir);
    pkg = new Package({
      targetPath,
      storeDir,
      packageName,
      packageVersion,
    });
    if (await pkg.exists()) {
      // 更新package
      await pkg.update();
    } else {
      // 安装package
      await pkg.install();
    }
  } else {
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
    });
  }
  const rootFile = pkg.getRootFilePath();

  if (rootFile) {
        try {
          // 在当前进程中调用
          // require(rootFile).call(null, Array.from(arguments));
          // 在node子进程中调用
          const args = Array.from(arguments);
          const cmd = args[args.length - 1];
          const o = Object.create(null);
          Object.keys(cmd).forEach(key => {
            if (cmd.hasOwnProperty(key) &&
              !key.startsWith('_') &&
              key !== 'parent') {
              o[key] = cmd[key];
            }
          });

          args[args.length - 1] = o;

          const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`;
          // -e 执行代码
          const child = spawn('node', ['-e', code], {
            cwd: process.cwd(),
            stdio: 'inherit',
          });
          child.on('error', e => {
            log.error(e.message);
            process.exit(1);
          });
          child.on('exit', e => {
            log.verbose('命令执行成功:' + e);
            process.exit(e);
          });
        } catch (e) {
          log.error(e.message);
        }
  } else {
    log.error('脚手架目录不存在');
  }
}

module.exports = exec;
