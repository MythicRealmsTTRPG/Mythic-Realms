import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const { argv } = yargs(hideBin(process.argv))
  .scriptName("dist")
  .version(false)
  .command("$0 <tag> <free-rules>", "Build the Mythic Realms package for distribution.", yargs => {
    yargs.positional("tag", {
      describe: "The release version tag.",
      type: "string"
    });
    yargs.positional("free-rules", {
      describe: "The path to the free rules content.",
      type: "string"
    });
    yargs.option("out", {
      alias: "o",
      describe: "The path to the output directory.",
      type: "string",
      default: "./dist",
      requiresArg: true
    });
    yargs.option("repo", {
      alias: "r",
      describe: "The Mythic Realms repository.",
      type: "string",
      default: "git@github.com:your-org/mythicrealms.git",
      requiresArg: true
    });
    yargs.option("url", {
      describe: "A public URL where releases are posted.",
      type: "string",
      default: "https://github.com/your-org/mythicrealms",
      requiresArg: true
    });
  })
  .help();

const { freeRules, out } = argv;
const paths = { dist: out, free: freeRules };

/* -------------------------------------------- */

async function build() {
  await passthrough("npm", ["run", "build"], { cwd: paths.dist });
  fs.renameSync(
    path.join(paths.dist, "mythicrealms-compiled.mjs"),
    path.join(paths.dist, "mythicrealms.mjs")
  );
}

/* -------------------------------------------- */

function checkout() {
  return passthrough("git", ["clone", "-b", argv.tag, "--depth", "1", argv.repo, paths.dist]);
}

/* -------------------------------------------- */

function compileManifest() {
  console.info("Making manifest changes...");

  const freeManifest = JSON.parse(fs.readFileSync(path.join(paths.free, "module.json"), "utf8"));
  const systemManifest = JSON.parse(fs.readFileSync(path.join(paths.dist, "system.json"), "utf8"));

  // Merge sourceBooks from free rules
  Object.assign(
    systemManifest.flags.mythicrealms.sourceBooks,
    freeManifest.flags?.mythicrealms?.sourceBooks ?? {}
  );

  // Remove hotReload flag
  delete systemManifest.flags.hotReload;

  // Ensure version and download URL are correct
  const [, version] = argv.tag.split("-");
  const download = `${argv.url}/releases/download/${argv.tag}/mythicrealms-${argv.tag}.zip`;
  if (systemManifest.version !== version) {
    throw new Error(`System manifest version did not match build version '${version}'.`);
  }
  if (systemManifest.download !== download) {
    throw new Error(`System download path did not match build download path '${download}'.`);
  }

  fs.writeFileSync(
    path.join(paths.dist, "system.json"),
    `${JSON.stringify(systemManifest, null, 2)}\n`,
    { mode: 0o644 }
  );
}

/* -------------------------------------------- */

function copyCompendiumContent() {
  console.info("Copying compendium content...");
  const source = path.join(paths.free, "packs", "_source");

  for (const file of fs.readdirSync(source, { recursive: true, withFileTypes: true })) {
    if (!file.isFile()) continue;

    const src = path.join(source, file.name);
    const dest = path.join(paths.dist, path.relative(paths.free, src));
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    let data = fs.readFileSync(src, "utf8");

    // Adjust icon paths for Mythic Realms
    data = data.replaceAll("modules/mythicrealms-free-rules/icons/", "systems/mythicrealms/icons/");

    console.info(`Writing ${dest}...`);
    fs.writeFileSync(dest, data, { mode: 0o644 });
  }
}

/* -------------------------------------------- */

function copyImages() {
  console.info("Copying images...");
  fs.cpSync(
    path.join(paths.free, "icons"),
    path.join(paths.dist, "icons"),
    { recursive: true }
  );
}

/* -------------------------------------------- */

function installDeps() {
  return passthrough("npm", ["ci", "--ignore-scripts"], { cwd: paths.dist });
}

/* -------------------------------------------- */

function passthrough(cmd, args = [], options = {}) {
  const { promise, resolve, reject } = Promise.withResolvers();
  const proc = spawn(cmd, args, { stdio: "inherit", ...options });
  const fail = () => {
    reject();
    process.exit(1);
  };
  proc.on("close", code => {
    if (code === 0) resolve();
    else fail();
  });
  proc.on("error", fail);
  return promise;
}

/* -------------------------------------------- */

function prepareDist() {
  console.info("Cleaning existing dist...");
  fs.rmSync(paths.dist, { force: true, recursive: true });
  fs.mkdirSync(paths.dist, { recursive: true });
}

/* -------------------------------------------- */

async function zip() {
  console.info("Building release artifact...");
  const manifest = JSON.parse(fs.readFileSync(path.join(paths.dist, "system.json"), "utf8"));
  const config = JSON.parse(fs.readFileSync(path.join(paths.dist, "foundryvtt.json"), "utf8"));

  const includes = [
    "system.json",
    ...(manifest.esmodules ?? []),
    ...(manifest.esmodules?.map(s => `${s}.map`) ?? []),
    ...(manifest.styles ?? []),
    ...(manifest.packs?.map(p => p.path) ?? []),
    ...(manifest.languages?.map(l => l.path) ?? []),
    ...(config.includes ?? [])
  ];

  const artifact = `mythicrealms-${argv.tag}.zip`;
  await passthrough("zip", [artifact, "-r", ...includes], { cwd: paths.dist });
  console.info(`Release artifact written to '${path.join(paths.dist, artifact)}'.`);
}

/* -------------------------------------------- */

(async function () {
  prepareDist();
  await checkout();
  await installDeps();
  compileManifest();
  copyImages();
  copyCompendiumContent();
  await build();
  await zip();
})();
