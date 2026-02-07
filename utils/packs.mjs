import fs from "fs";
import path from "path";
import { readdir, readFile, writeFile, rm } from "node:fs/promises";
import YAML from "js-yaml";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import logger from "fancy-log";
import { compilePack, extractPack } from "@foundryvtt/foundryvtt-cli";

/* ----------------------------------------- */
/*  Configuration                             */
/* ----------------------------------------- */
const PACK_SRC = "packs/_source"; // Source folder with YAML/JSON entries
const PACK_DEST = "packs";         // Compiled compendium destination

/* ----------------------------------------- */
/*  CLI Setup                                 */
/* ----------------------------------------- */
const argv = yargs(hideBin(process.argv))
  .command(packageCommand())
  .help().alias("help", "h")
  .argv;

function packageCommand() {
  return {
    command: "package [action] [pack] [entry]",
    describe: "Manage Mythic Realms compendium packs",
    builder: yargs => {
      yargs.positional("action", {
        describe: "Action to perform",
        type: "string",
        choices: ["clean", "pack", "unpack"]
      });
      yargs.positional("pack", {
        describe: "Name of pack to target",
        type: "string"
      });
      yargs.positional("entry", {
        describe: "Specific entry name (for clean/unpack only)",
        type: "string"
      });
    },
    handler: async argv => {
      const { action, pack, entry } = argv;
      switch (action) {
        case "clean": return await cleanPacks(pack, entry);
        case "pack": return await compilePacks(pack);
        case "unpack": return await extractPacks(pack, entry);
      }
    }
  };
}

/* ----------------------------------------- */
/*  Cleaning Entries                           */
/* ----------------------------------------- */
function cleanPackEntry(data, { clearSourceId = true, ownership = 0 } = {}) {
  // Reset ownership
  if (data.ownership) data.ownership = { default: ownership };

  // Clear standard source references
  if (clearSourceId) {
    delete data._stats?.compendiumSource;
    delete data.flags?.core?.sourceId;
  }
  delete data.flags?.importSource;
  delete data.flags?.exportSource;

  // Standardize system fields
  if (data.system?.activation?.cost === 0) data.system.activation.cost = null;
  if (data.system?.duration?.value === "0") data.system.duration.value = "";
  if (data.system?.target?.value === 0) data.system.target.value = null;
  if (data.system?.target?.width === 0) data.system.target.width = null;
  if (data.system?.range?.value === 0) data.system.range.value = null;
  if (data.system?.range?.long === 0) data.system.range.long = null;
  if (data.system?.uses?.value === 0) data.system.uses.value = null;
  if (data.system?.uses?.max === "0") data.system.uses.max = "";
  if (data.system?.save?.dc === 0) data.system.save.dc = null;
  if (data.system?.capacity?.value === 0) data.system.capacity.value = null;
  if (data.system?.strength === 0) data.system.strength = null;

  // Remove default placeholder images for actors
  if (["character", "npc"].includes(data.type) && data.img === "icons/svg/mystery-man.svg") {
    data.img = "";
    data.prototypeToken.texture.src = "";
  }

  // Recurse through effects, items, and pages
  if (data.effects) data.effects.forEach(e => cleanPackEntry(e, { clearSourceId: false }));
  if (data.items) data.items.forEach(i => cleanPackEntry(i, { clearSourceId: false }));
  if (data.pages) data.pages.forEach(p => cleanPackEntry(p, { ownership: -1 }));

  // Clean text fields
  if (data.system?.description?.value) data.system.description.value = cleanString(data.system.description.value);
  if (data.label) data.label = cleanString(data.label);
  if (data.name) data.name = cleanString(data.name);
}

function cleanString(str) {
  return str.replace(/\u2060/gu, "")
            .replace(/[‘’]/gu, "'")
            .replace(/[“”]/gu, '"')
            .trim();
}

/* ----------------------------------------- */
/*  Clean Packs                               */
/* ----------------------------------------- */
async function cleanPacks(packName, entryName) {
  entryName = entryName?.toLowerCase();

  const folders = (await readdir(PACK_SRC, { withFileTypes: true }))
    .filter(f => f.isDirectory() && (!packName || f.name === packName));

  async function* walkDir(dir) {
    const files = await readdir(dir, { withFileTypes: true });
    for (const f of files) {
      const fullPath = path.join(dir, f.name);
      if (f.isDirectory()) yield* walkDir(fullPath);
      else if (path.extname(f.name) === ".yml") yield fullPath;
    }
  }

  for (const folder of folders) {
    logger.info(`Cleaning Mythic Realms pack: ${folder.name}`);
    for await (const src of walkDir(path.join(PACK_SRC, folder.name))) {
      const data = YAML.load(await readFile(src, "utf8"));
      if (entryName && (entryName !== data.name.toLowerCase())) continue;
      if (!data._id || !data._key) {
        logger.warn(`Skipping ${src}, missing _id or _key`);
        continue;
      }
      cleanPackEntry(data);
      await rm(src, { force: true });
      await writeFile(src, `${YAML.dump(data)}\n`, { mode: 0o664 });
    }
  }
}

/* ----------------------------------------- */
/*  Compile Packs                             */
/* ----------------------------------------- */
async function compilePacks(packName) {
  const folders = (await readdir(PACK_SRC, { withFileTypes: true }))
    .filter(f => f.isDirectory() && (!packName || f.name === packName));

  for (const folder of folders) {
    const src = path.join(PACK_SRC, folder.name);
    const dest = path.join(PACK_DEST, folder.name);
    logger.info(`Compiling Mythic Realms pack: ${folder.name}`);
    await compilePack(src, dest, { recursive: true, log: true, transformEntry: cleanPackEntry, yaml: true });
  }
}

/* ----------------------------------------- */
/*  Extract Packs                             */
/* ----------------------------------------- */
async function extractPacks(packName, entryName) {
  entryName = entryName?.toLowerCase();
  const system = JSON.parse(await readFile("./system.json", "utf8"));
  const packs = system.packs.filter(p => !packName || p.name === packName);

  for (const packInfo of packs) {
    const dest = path.join(PACK_SRC, packInfo.name);
    logger.info(`Extracting Mythic Realms pack: ${packInfo.name}`);

    const folders = {};
    const containers = {};

    await extractPack(packInfo.path, dest, {
      log: false,
      transformEntry: e => {
        if (e._key.startsWith("!folders")) folders[e._id] = { name: slugify(e.name), folder: e.folder };
        else if (e.type === "container") containers[e._id] = { name: slugify(e.name), container: e.system?.container, folder: e.folder };
        return false;
      }
    });

    const buildPath = (collection, entry, parentKey) => {
      let parent = collection[entry[parentKey]];
      entry.path = entry.name;
      while (parent) {
        entry.path = path.join(parent.name, entry.path);
        parent = collection[parent[parentKey]];
      }
    };

    Object.values(folders).forEach(f => buildPath(folders, f, "folder"));
    Object.values(containers).forEach(c => {
      buildPath(containers, c, "container");
      const folder = folders[c.folder];
      if (folder) c.path = path.join(folder.path, c.path);
    });

    await extractPack(packInfo.path, dest, {
      log: true,
      transformEntry: entry => {
        if (entryName && (entryName !== entry.name.toLowerCase())) return false;
        cleanPackEntry(entry);
      },
      transformName: entry => {
        if (entry._id in folders) return path.join(folders[entry._id].path, "_folder.yml");
        if (entry._id in containers) return path.join(containers[entry._id].path, "_container.yml");
        const outputName = slugify(entry.name);
        const parent = containers[entry.system?.container] ?? folders[entry.folder];
        return path.join(parent?.path ?? "", `${outputName}.yml`);
      },
      yaml: true
    });
  }
}

/* ----------------------------------------- */
/*  Utilities                                 */
/* ----------------------------------------- */
function slugify(name) {
  return name.toLowerCase()
             .replace("'", "")
             .replace(/[^a-z0-9]+/gi, " ")
             .trim()
             .replace(/\s+|-{2,}/g, "-");
}
