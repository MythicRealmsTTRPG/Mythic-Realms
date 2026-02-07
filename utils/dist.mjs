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
      describe: "Path to the free rules content (Afflictions, Statuses, etc.)",
      type: "string"
    });
    yargs.option("out", {
      alias: "o",
      describe: "Path to the output directory.",
      type: "string",
      default: "./dist",
      requiresArg: true
    });
    yargs.option("repo", {
      alias: "r",
      describe: "The Mythic Realms repository.",
      type: "string",
      default: "git@github.com:YourUsername/MythicRealms.git",
      requiresArg: true
    });
    yargs.option("url", {
      describe: "Public URL where releases are posted.",
      type: "string",
      default: "https://github.com/YourUsername/MythicRealms",
      requiresArg: true
    });
  })
  .help();

const { freeRules, out } = argv;
const paths = { dist: out, free: freeRules };

/* -------------------------------------------- */

/**
 * Spawn a child command and pass output through.
 */
function passthrough(cmd, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: "inherit", ...options });
    proc.on("close", code => code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)));
    proc.on("error", reject);
  });
}

/* -------------------------------------------- */

/**
 * Clean and prepare dist directory.
 */
function prepareDist() {
  console.info("Cleaning existing dist...");
  fs.rmSync(paths.dist, { force: true, recursive: true });
  fs.mkdirSync(paths.dist, { recursive: true });
}

/* -------------------------------------------- */

/**
 * Clone the Mythic Realms repo at the given tag.
 */
function checkout() {
  console.info("Cloning Mythic Realms repo...");
  return passthrough("git", ["clone", "-b", argv.tag, "--depth", "1", argv.repo, paths.dist]);
}

/* -------------------------------------------- */

/**
 * Install npm dependencies.
 */
function installDeps() {
  console.info("Installing dependencies...");
  return passthrough("npm", ["ci", "--ignore-scripts"], { cwd: paths.dist });
}

/* -------------------------------------------- */

/**
 * Compile a new system.json manifest.
 */
function compileManifest() {
  console.info("Compiling system manifest...");

  const freeManifest = JSON.parse(fs.readFileSync(path.join(paths.free, "module.json"), "utf8"));
  const systemManifest = JSON.parse(fs.readFileSync(path.join(paths.dist, "system.json"), "utf8"));

  // Merge free rules (like sourcebooks)
  Object.assign(systemManifest.flags.mythicrealms.sourceBooks, freeManifest.flags?.mythicrealms?.sourceBooks ?? {});

  // Remove dev-only flags
  delete systemManifest.flags.hotReload;

  // Ensure version and download URL match
  const [, version] = argv.tag.split("-");
  const download = `${argv.url}/releases/download/${argv.tag}/mythicrealms-${argv.tag}.zip`;
  if (systemManifest.version !== version) {
    throw new Error(`System manifest version mismatch '${version}'.`);
  }
  if (systemManifest.download !== download) {
    throw new Error(`System download path mismatch '${download}'.`);
  }

  fs.writeFileSync(path.join(paths.dist, "system.json"), JSON.stringify(systemManifest, null, 2) + "\n", { mode: 0o644 });
}

/* -------------------------------------------- */

/**
 * Copy free rules content (Afflictions, Statuses, etc.) into dist.
 */
function copyCompendiumContent() {
  console.info("Copying compendium content...");
  const source = path.join(paths.free, "packs");
  for (const file of fs.readdirSync(source, { withFileTypes: true })) {
    const src = path.join(source, file.name);
    const dest = path.join(paths.dist, "packs", file.name);
    if (file.isDirectory()) {
      fs.cpSync(src, dest, { recursive: true });
    } else if (file.isFile()) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
    console.info(`Copied ${file.name} to dist/packs`);
  }
}

/* -------------------------------------------- */

/**
 * Copy images/icons for Mythic Realms.
 */
function copyImages() {
  console.info("Copying icons...");
  const src = path.join(paths.free, "icons");
  const dest = path.join(paths.dist, "icons");
  if (fs.existsSync(src)) fs.cpSync(src, dest, { recursive: true });
}

/* -------------------------------------------- */

/**
 * Run build scripts (npm build).
 */
async function build() {
  console.info("Building Mythic Realms system...");
  await passthrough("npm", ["run", "build"], { cwd: paths.dist });
  fs.renameSync(path.join(paths.dist, "mythicrealms-compiled.mjs"), path.join(paths.dist, "mythicrealms.mjs"));
}

/* -------------------------------------------- */

/**
 * Produce the release zip.
 */
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
  console.info(`Release artifact written to '${path.join(paths.dist, artifact)}'`);
}

/* -------------------------------------------- */

(async function main() {
  try {
    prepareDist();
    await checkout();
    await installDeps();
    compileManifest();
    copyImages();
    copyCompendiumContent();
    await build();
    await zip();
    console.info("Mythic Realms build complete!");
  } catch (err) {
    console.error("Build failed:", err);
    process.exit(1);
  }
})();
