"use strict";

module.exports = core;

const path = require("path");
const semver = require("semver"); // 对比版本号
const colors = require("colors/safe");
const userHome = require("user-home"); // 跨操作系统获取用户主目录
const pathExists = require("path-exists").sync; // 判断文件是否存在
const commander = require("commander");
const log = require("@kev-cli/log");
const exec = require("@kev-cli/exec");

const constant = require("./const");
const pkg = require("../package.json");

const program = new commander.Command();

async function core() {
  try {
    await prepare();
    registerCommand();
  } catch (e) {
    log.error(e.message);
    if (program.opts().debug) {
      console.log(e);
    }
  }
}

function registerCommand() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage("<command> [options]")
    .version(pkg.version)
    .option("-d, --debug", "是否开启调试模式", false)
    .option("-tp, --targetPath <targetPath>", "是否指定本地调试文件路径", "");

  program
    .command("init [projectName]")
    .option("-f, --force", "是否强制初始化项目")
    .action(exec);

  // 开启debug模式
  program.on("option:debug", function () {
    process.env.LOG_LEVEL = "verbose";
    log.level = process.env.LOG_LEVEL;
  });

  // 指定targetPath
  program.on("option:targetPath", function (targetPath) {
    process.env.CLI_TARGET_PATH = targetPath;
  });

  // 对未知命令监听
  program.on("command:*", function (obj) {
    const availableCommands = program.commands.map((cmd) => cmd.name());
    console.log(colors.red("未知的命令：" + obj[0]));
    if (availableCommands.length > 0) {
      console.log(colors.red("可用命令：" + availableCommands.join(",")));
    }
  });

  program.parse(process.argv);

  if (program.args && program.args.length < 1) {
    program.outputHelp();
    console.log();
  }
}

async function prepare() {
  checkPkgVersion();
  checkRoot();
  checkUserHome();
  checkEnv();
  await checkGlobalUpdate();
}

async function checkGlobalUpdate() {
  const currentVersion = pkg.version;
  const npmName = pkg.name;
  const { getNpmSemverVersion } = require("@kev-cli/get-npm-info");
  const lastVersion = await getNpmSemverVersion(currentVersion, npmName);

  if (lastVersion && semver.gt(lastVersion, currentVersion)) {
    log.warn(
      colors.yellow(`请手动更新 ${npmName}，当前版本：${currentVersion}，最新版本：${lastVersion}
                更新命令： npm install -g ${npmName}`)
    );
  }
}

function checkEnv() {
  const dotenv = require("dotenv"); // 从 .env 文件中加载环境变量 （可以在用户的主目录下面创建一个.env 文件，然后通过 dotenv 读取）
  const dotenvPath = path.resolve(userHome, ".env");
  if (pathExists(dotenvPath)) {
    dotenv.config({
      path: dotenvPath,
    });
  }
  // 如果本地用户主目录下不存在 .env 文件，就新建一个
  createDefaultConfig();
}

function createDefaultConfig() {
  const cliConfig = {
    home: userHome,
  };

  if (process.env.CLI_HOME) {
    cliConfig["cliHome"] = path.join(userHome, process.env.CLI_HOME);
  } else {
    cliConfig["cliHome"] = path.join(userHome, constant.DEFAULT_CLI_HOME);
  }
  process.env.CLI_HOME_PATH = cliConfig.cliHome;
}

/**
 * 检查用户主目录
 *  如果用户主目录不存在的话，无法缓存
 */
function checkUserHome() {
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red("当前登录用户主目录不存在！"));
  }
}

/**
 * 判断当前用户是否是root启动
 *  process.geteuid(); 如果返回 0 就是超级管理员（root账户启动的）用root账号去启动创建的文件就是root账户的, 所以如果是root账户启动的就降级 使其返回 501 默认值
 *  如果是以root账号启动并创建的目录，并且设置了读写权限，那么当其他账户使用时就无法修改这个文件了，容易出现权限报错问题，所以会在这里进行降级操作
 */
function checkRoot() {
  const rootCheck = require("root-check");
  rootCheck();
}

function checkPkgVersion() {
  log.info("cli", pkg.version);
}
