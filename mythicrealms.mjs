/**
 * MythicRealms game system for Foundry Virtual Tabletop
 * A standalone epic-fantasy tabletop role-playing system where power carries consequence
 * and the world evolves through mythic progression and player choice.
 *
 * Author: ScaleScribe
 * Software License: MIT
 * Content License:
 * See LICENSE.txt (Mythic Realms original content and third-party attributions)
 *
 * Repository: https://github.com/MythicRealmsTTRPG/Mythic-Realms
 * Issue Tracker:
 */

// Import Configuration
import MythicRealms from "./module/config.mjs";
import {
  applyLegacyRules,
  registerDeferredSettings,
  registerSystemKeybindings,
  registerSystemSettings
} from "./module/settings.mjs";

// Import Submodules
import * as applications from "./module/applications/_module.mjs";
import * as canvas from "./module/canvas/_module.mjs";
import * as dataModels from "./module/data/_module.mjs";
import * as dice from "./module/dice/_module.mjs";
import * as documents from "./module/documents/_module.mjs";
import * as enrichers from "./module/enrichers.mjs";
import * as Filter from "./module/filter.mjs";
import * as migrations from "./module/migration.mjs";
import ModuleArt from "./module/module-art.mjs";
import {
  registerModuleData,
  registerModuleRedirects,
  setupModulePacks
} from "./module/module-registration.mjs";
import { default as registry } from "./module/registry.mjs";
import MythicTooltips from "./module/tooltips.mjs";
import * as utils from "./module/utils.mjs";
import MythicDragDrop from "./module/drag-drop.mjs";

/* -------------------------------------------- */
/*  Define Module Structure                     */
/* -------------------------------------------- */

globalThis.mythicrealms = {
  applications,
  canvas,
  config: MythicRealms,
  dataModels,
  dice,
  documents,
  enrichers,
  Filter,
  migrations,
  registry,
  ui: {},
  utils
};

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", function () {
  // Expose the system API under a Mythic Realms namespace
  globalThis.mythicrealms = game.mythicrealms = Object.assign(game.system, globalThis.mythicrealms);
  utils.log(`Initializing Mythic Realms - Version ${game.system.version}\n${MythicRealms.ASCII ?? ""}`);

  // Record Configuration Values
  CONFIG.MYTHICREALMS = MythicRealms;

  // Document classes / collections (keeping your existing document implementations)
  CONFIG.ActiveEffect.documentClass = documents.ActiveEffect5e;
  CONFIG.ActiveEffect.legacyTransferral = false;

  CONFIG.Actor.collection = dataModels.collection.Actors5e;
  CONFIG.Actor.documentClass = documents.Actor5e;

  CONFIG.Adventure.documentClass = documents.Adventure5e;

  CONFIG.Canvas.layers.tokens.layerClass = CONFIG.Token.layerClass = canvas.layers.TokenLayer5e;

  CONFIG.ChatMessage.documentClass = documents.ChatMessage5e;

  CONFIG.Combat.documentClass = documents.Combat5e;
  CONFIG.Combatant.documentClass = documents.Combatant5e;
  CONFIG.CombatantGroup.documentClass = documents.CombatantGroup5e;

  CONFIG.Item.collection = dataModels.collection.Items5e;
  CONFIG.Item.compendiumIndexFields.push("system.container", "system.identifier");
  CONFIG.Item.documentClass = documents.Item5e;

  CONFIG.JournalEntryPage.documentClass = documents.JournalEntryPage5e;

  CONFIG.Token.documentClass = documents.TokenDocument5e;
  CONFIG.Token.objectClass = canvas.Token5e;
  CONFIG.Token.rulerClass = canvas.TokenRuler5e;
  CONFIG.Token.movement.TerrainData = dataModels.TerrainData5e;

  CONFIG.User.documentClass = documents.User5e;

  CONFIG.time.roundTime = 6;

  // Template paths must match your system id folder
  Roll.TOOLTIP_TEMPLATE = "systems/mythicrealms/templates/chat/roll-breakdown.hbs";

  // Dice configuration
  CONFIG.Dice.BasicDie = CONFIG.Dice.terms.d = dice.BasicDie;
  CONFIG.Dice.BasicRoll = dice.BasicRoll;
  CONFIG.Dice.DamageRoll = dice.DamageRoll;
  CONFIG.Dice.D20Die = dice.D20Die;
  CONFIG.Dice.D20Roll = dice.D20Roll;

  // Templates / UI
  CONFIG.MeasuredTemplate.defaults.angle = 53.13;
  CONFIG.Note.objectClass = canvas.Note5e;

  CONFIG.ui.chat = applications.ChatLog5e;
  CONFIG.ui.combat = applications.combat.CombatTracker5e;
  CONFIG.ui.items = applications.item.ItemDirectory5e;

  // Drag-drop handler
  CONFIG.ux.DragDrop = MythicDragDrop;

  // Register System Settings & Keybindings
  registerSystemSettings();
  registerSystemKeybindings();

  // Configure module art, bastions, tooltips (as you defined)
  game.mythicrealms.moduleArt = new ModuleArt();
  game.mythicrealms.bastion = new documents.Bastion();
  game.mythicrealms.tooltips = new MythicTooltips();

  // Optional feature flags based on settings (settings keys must match your system id)
  if (!game.settings.get("mythicrealms", "honorScore")) delete MythicRealms.abilities?.hon;
  if (!game.settings.get("mythicrealms", "sanityScore")) delete MythicRealms.abilities?.san;

  // Legacy rules
  if (game.mythicrealms.settings?.rulesVersion === "legacy") applyLegacyRules();

  // Register registries from config (only if present)
  MythicRealms.SPELL_LISTS?.forEach(uuid => game.mythicrealms.registry?.spellLists?.register?.(uuid));

  // Register module data from manifests
  registerModuleData();
  registerModuleRedirects();

  // Register Roll Extensions
  CONFIG.Dice.rolls = [dice.BasicRoll, dice.D20Roll, dice.DamageRoll];

  // Hook up system data types
  Object.assign(CONFIG.ActiveEffect.dataModels, dataModels.activeEffect.config);
  CONFIG.Actor.dataModels = dataModels.actor.config;
  CONFIG.ChatMessage.dataModels = dataModels.chatMessage.config;
  CONFIG.Item.dataModels = dataModels.item.config;
  CONFIG.JournalEntryPage.dataModels = dataModels.journal.config;
  Object.assign(CONFIG.RegionBehavior.dataModels, dataModels.regionBehavior.config);
  Object.assign(CONFIG.RegionBehavior.typeIcons, dataModels.regionBehavior.icons);

  // Add fonts
  _configureFonts();

  // Register sheet application classes
  const DocumentSheetConfig = foundry.applications.apps.DocumentSheetConfig;

  // ACTORS
  DocumentSheetConfig.unregisterSheet(Actor, "core", foundry.appv1.sheets.ActorSheet);
  DocumentSheetConfig.registerSheet(Actor, "mythicrealms", applications.actor.CharacterActorSheet, {
    types: ["character"],
    makeDefault: true,
    label: "MYTHICREALMS.SheetClass.Character"
  });
  DocumentSheetConfig.registerSheet(Actor, "mythicrealms", applications.actor.NPCActorSheet, {
    types: ["npc"],
    makeDefault: true,
    label: "MYTHICREALMS.SheetClass.NPC"
  });
  DocumentSheetConfig.registerSheet(Actor, "mythicrealms", applications.actor.VehicleActorSheet, {
    types: ["vehicle"],
    makeDefault: true,
    label: "MYTHICREALMS.SheetClass.Vehicle"
  });
  DocumentSheetConfig.registerSheet(Actor, "mythicrealms", applications.actor.GroupActorSheet, {
    types: ["group"],
    makeDefault: true,
    label: "MYTHICREALMS.SheetClass.Group"
  });
  DocumentSheetConfig.registerSheet(Actor, "mythicrealms", applications.actor.EncounterActorSheet, {
    types: ["encounter"],
    makeDefault: true,
    label: "MYTHICREALMS.SheetClass.Encounter"
  });

  // ITEMS
  DocumentSheetConfig.unregisterSheet(Item, "core", foundry.appv1.sheets.ItemSheet);
  DocumentSheetConfig.registerSheet(Item, "mythicrealms", applications.item.ItemSheet5e, {
    makeDefault: true,
    label: "MYTHICREALMS.SheetClass.Item"
  });
  DocumentSheetConfig.unregisterSheet(Item, "mythicrealms", applications.item.ItemSheet5e, { types: ["container"] });
  DocumentSheetConfig.registerSheet(Item, "mythicrealms", applications.item.ContainerSheet, {
    makeDefault: true,
    types: ["container"],
    label: "MYTHICREALMS.SheetClass.Container"
  });

  // JOURNALS
  DocumentSheetConfig.registerSheet(JournalEntry, "mythicrealms", applications.journal.JournalEntrySheet5e, {
    makeDefault: true,
    label: "MYTHICREALMS.SheetClass.JournalEntry"
  });
  DocumentSheetConfig.registerSheet(JournalEntry, "mythicrealms", applications.journal.JournalSheet5e, {
    makeDefault: false,
    canConfigure: false,
    canBeDefault: false,
    label: "MYTHICREALMS.SheetClass.JournalEntrySheetLegacy"
  });
  DocumentSheetConfig.registerSheet(JournalEntryPage, "mythicrealms", applications.journal.JournalClassPageSheet, {
    label: "MYTHICREALMS.SheetClass.ClassSummary",
    types: ["class", "subclass"]
  });
  DocumentSheetConfig.registerSheet(JournalEntryPage, "mythicrealms", applications.journal.JournalMapLocationPageSheet, {
    label: "MYTHICREALMS.SheetClass.MapLocation",
    types: ["map"]
  });
  DocumentSheetConfig.registerSheet(JournalEntryPage, "mythicrealms", applications.journal.JournalRulePageSheet, {
    label: "MYTHICREALMS.SheetClass.Rule",
    types: ["rule"]
  });
  DocumentSheetConfig.registerSheet(JournalEntryPage, "mythicrealms", applications.journal.JournalSpellListPageSheet, {
    label: "MYTHICREALMS.SheetClass.SpellList",
    types: ["spells"]
  });

  // REGION BEHAVIORS
  DocumentSheetConfig.unregisterSheet(RegionBehavior, "core", foundry.applications.sheets.RegionBehaviorConfig, {
    types: ["mythicrealms.difficultTerrain", "mythicrealms.rotateArea"]
  });
  DocumentSheetConfig.registerSheet(RegionBehavior, "mythicrealms", applications.regionBehavior.DifficultTerrainConfig, {
    label: "MYTHICREALMS.SheetClass.DifficultTerrain",
    types: ["mythicrealms.difficultTerrain"]
  });
  DocumentSheetConfig.registerSheet(RegionBehavior, "mythicrealms", applications.regionBehavior.RotateAreaConfig, {
    label: "MYTHICREALMS.SheetClass.RotateArea",
    types: ["mythicrealms.rotateArea"]
  });

  // ROLL TABLES
  DocumentSheetConfig.registerSheet(RollTable, "mythicrealms", applications.RollTableSheet5e, {
    makeDefault: true,
    label: "MYTHICREALMS.SheetClass.RollTable"
  });

  // TOKENS
  CONFIG.Token.prototypeSheetClass = applications.PrototypeTokenConfig5e;
  DocumentSheetConfig.unregisterSheet(TokenDocument, "core", foundry.applications.sheets.TokenConfig);
  DocumentSheetConfig.registerSheet(TokenDocument, "mythicrealms", applications.TokenConfig5e, {
    label: "MYTHICREALMS.SheetClass.Token"
  });

  // Preload Handlebars helpers & partials
  utils.registerHandlebarsHelpers();
  utils.preloadHandlebarsTemplates();

  // Enrichers
  enrichers.registerCustomEnrichers();

  // Exhaustion handling
  documents.ActiveEffect5e.registerHUDListeners();

  // Set up token movement actions
  documents.TokenDocument5e.registerMovementActions();

  // Custom movement cost aggregator
  CONFIG.Token.movement.costAggregator = (results) => Math.max(...results.map(i => i.cost));

  // Setup Calendar (Astral Concordat default)
  _configureCalendar();
});

/* -------------------------------------------- */
/*  Foundry VTT Setup                           */
/* -------------------------------------------- */

Hooks.once("setup", function () {
  // Configure trackable & consumable attributes.
  _configureTrackableAttributes();
  _configureConsumableAttributes();

  // If your config contains a trackableAttributes list, expand it
  if (CONFIG.MYTHICREALMS?.trackableAttributes) {
    CONFIG.MYTHICREALMS.trackableAttributes = expandAttributeList(CONFIG.MYTHICREALMS.trackableAttributes);
  }

  // Module art + tooltips
  game.mythicrealms.moduleArt.registerModuleArt();
  MythicTooltips.activateListeners?.();
  game.mythicrealms.tooltips.observe?.();

  // Register settings after modules have had a chance to initialize
  registerDeferredSettings();

  // Set up compendiums with custom applications & sorting
  setupModulePacks();

  // Create CSS for currencies (if defined in config)
  const currenciesConfig = CONFIG.MYTHICREALMS?.currencies ?? {};
  const style = document.createElement("style");
  const currencies = append =>
    Object.entries(currenciesConfig).map(([key, { icon }]) => `&.${key}${append ?? ""} { background-image: url("${icon}"); }`);

  style.innerHTML = `
    :is(.mythicrealms, .mythicrealms-journal) :is(i, span).currency {
      ${currencies().join("\n")}
    }
    .mythicrealms .form-group label.label-icon.currency {
      ${currencies("::after").join("\n")}
    }
  `;
  document.head.append(style);
});

/* -------------------------------------------- */
/*  Localization Init                           */
/* -------------------------------------------- */

Hooks.once("i18nInit", () => {
  // Set up status effects. Explicitly performed after init and before prelocalization.
  _configureStatusEffects();

  // Legacy localization shim (optional)
  if (game.mythicrealms.settings?.rulesVersion === "legacy") {
    const { translations, _fallback } = game.i18n;

    foundry.utils.mergeObject(translations, {
      MYTHICREALMS: {
        // Keep these if you truly have legacy keys; otherwise remove.
        "Language.Category.Rare": game.i18n.localize("MYTHICREALMS.Language.Category.Exotic")
      }
    });

    // If you have fallback merges you want, keep them here (safe-guarded)
    void _fallback;
  }

  utils.performPreLocalization(CONFIG.MYTHICREALMS);

  Object.values(CONFIG.MYTHICREALMS.activityTypes ?? {}).forEach(c => c.documentClass?.localize?.());
  Object.values(CONFIG.MYTHICREALMS.advancementTypes ?? {}).forEach(c => c.documentClass?.localize?.());

  foundry.helpers.Localization.localizeDataModel(dataModels.settings.CalendarConfigSetting);
  foundry.helpers.Localization.localizeDataModel(dataModels.settings.CalendarPreferencesSetting);
  foundry.helpers.Localization.localizeDataModel(dataModels.settings.TransformationSetting);

  // Spellcasting
  dataModels.spellcasting.SpellcastingModel.fromConfig();
});

/* -------------------------------------------- */
/*  Foundry VTT Ready                           */
/* -------------------------------------------- */

Hooks.once("ready", function () {
  // Hotbar macro creation
  Hooks.on("hotbarDrop", (bar, data, slot) => {
    if (["ActiveEffect", "Activity", "Item"].includes(data.type)) {
      documents.macro?.createMythicMacro?.(data, slot);
      return false;
    }
  });

  // Adjust sourced items on actors now that compendium UUID redirects have been initialized
  game.actors.forEach(a => a.sourcedItems?._redirectKeys?.());

  // Register items by type (if your registry supports this)
  game.mythicrealms.registry?.classes?.initialize?.();
  game.mythicrealms.registry?.subclasses?.initialize?.();

  // Chat message listeners
  documents.ChatMessage5e.activateListeners?.();

  // Bastion initialization (if your system uses it)
  game.mythicrealms.bastion?.initializeUI?.();

  // Display the calendar HUD
  if (CONFIG.MYTHICREALMS?.calendar?.application) {
    game.mythicrealms.ui.calendar = new CONFIG.MYTHICREALMS.calendar.application();
    game.mythicrealms.ui.calendar.render({ force: true });
  }

  // Determine whether a system migration is required and feasible
  if (!game.user.isGM) return;

  const cv =
    game.settings.get("mythicrealms", "systemMigrationVersion") ||
    game.world.flags.mythicrealms?.version;

  const totalDocuments = game.actors.size + game.scenes.size + game.items.size;

  if (!cv && totalDocuments === 0) {
    return game.settings.set("mythicrealms", "systemMigrationVersion", game.system.version);
  }

  if (cv && !foundry.utils.isNewerVersion(game.system.flags.needsMigrationVersion, cv)) return;

  // Optional compendium pack folder migration hooks
  // if (foundry.utils.isNewerVersion("0.1.0", cv)) { ... }

  // Perform the migration
  if (cv && foundry.utils.isNewerVersion(game.system.flags.compatibleMigrationVersion, cv)) {
    ui.notifications.error("MIGRATION.MythicVersionTooOldWarning", { localize: true, permanent: true });
  }

  migrations.migrateWorld();
});

/* -------------------------------------------- */
/*  System Styling                              */
/* -------------------------------------------- */

Hooks.on("renderGamePause", (app, html) => {
  if (Hooks.events.renderGamePause.length > 1) return;

  html.classList.add("mythicrealms");

  const container = document.createElement("div");
  container.classList.add("flexcol");
  container.append(...html.children);
  html.append(container);

  const img = html.querySelector("img");
  if (img) {
    img.src = "systems/mythicrealms/ui/official/mythicrealms-pause.svg";
    img.className = "";
  }
});

Hooks.on("renderSettings", (app, html) => applications.settings.sidebar.renderSettings(html));

/* -------------------------------------------- */
/*  Other Hooks                                 */
/* -------------------------------------------- */

Hooks.on("applyCompendiumArt", (documentClass, ...args) => documentClass.applyCompendiumArt?.(...args));

Hooks.on("renderChatPopout", documents.ChatMessage5e.onRenderChatPopout);
Hooks.on("getChatMessageContextOptions", documents.ChatMessage5e.addChatMessageContextOptions);

Hooks.on("renderChatLog", (app, html) => {
  documents.Item5e.chatListeners?.(html);
  documents.ChatMessage5e.onRenderChatLog?.(html);
});
Hooks.on("renderChatPopout", (app, html) => documents.Item5e.chatListeners?.(html));

Hooks.on("chatMessage", (app, message) => applications.Award.chatMessage(message));
Hooks.on("createChatMessage", dataModels.chatMessage.RequestMessageData.onCreateMessage);
Hooks.on("updateChatMessage", dataModels.chatMessage.RequestMessageData.onUpdateResultMessage);

Hooks.on("renderActorDirectory", (app, html) => documents.Actor5e.onRenderActorDirectory?.(html));
Hooks.on("getActorContextOptions", documents.Actor5e.addDirectoryContextOptions);
Hooks.on("getItemContextOptions", documents.Item5e.addDirectoryContextOptions);

Hooks.on("renderCompendiumDirectory", (app, html) => applications.CompendiumBrowser.injectSidebarButton(html));

Hooks.on("renderJournalEntryPageSheet", applications.journal.JournalEntrySheet5e.onRenderJournalPageSheet);

Hooks.on("renderActiveEffectConfig", documents.ActiveEffect5e.onRenderActiveEffectConfig);

Hooks.on("renderDocumentSheetConfig", (app, html) => {
  const { document } = app.options;
  if ((document instanceof Actor) && document.system.isGroup) {
    applications.actor.MultiActorSheet.addDocumentSheetConfigOptions(app, html);
  }
});

Hooks.on("targetToken", canvas.Token5e.onTargetToken);

Hooks.on("renderCombatTracker", (app, html) => app.renderGroups(html));

Hooks.on("preCreateScene", (doc, createData) => {
  const units = utils.defaultUnits("length");
  if ((units !== game.mythicrealms.grid.units) &&
      !foundry.utils.getProperty(createData, "grid.distance") &&
      !foundry.utils.getProperty(createData, "grid.units")) {
    doc.updateSource({
      grid: {
        distance: utils.convertLength(game.mythicrealms.grid.distance, game.mythicrealms.grid.units, units, { strict: false }),
        units
      }
    });
  }
});

Hooks.on("updateWorldTime", (...args) => {
  // Astral Concordat update hook (if your calendar class exposes it)
  dataModels.calendar.AstralConcordatCalendar?.onUpdateWorldTime?.(...args);
  CONFIG.MYTHICREALMS?.calendar?.application?.onUpdateWorldTime?.(...args);
});

/* --------------------------------------------- */
/*  Helpers                                     */
/* --------------------------------------------- */

/**
 * Expand a list of attribute paths into an object that can be traversed.
 * @param {string[]} attributes  The initial attributes configuration.
 * @returns {object}  The expanded object structure.
 */
function expandAttributeList(attributes) {
  return attributes.reduce((obj, attr) => {
    foundry.utils.setProperty(obj, attr, true);
    return obj;
  }, {});
}

/**
 * Configure world calendar based on setting.
 * Default: The Astral Concordat.
 */
function _configureCalendar() {
  // Default Mythic Realms calendar: The Astral Concordat
  CONFIG.time.earthCalendarClass = dataModels.calendar.AstralConcordatCalendar;
  CONFIG.time.worldCalendarClass = dataModels.calendar.AstralConcordatCalendar;

  /**
   * A hook event that fires during the `init` step to give modules a chance to customize
   * the Astral Concordat calendar configuration before loading the world calendar.
   *
   * @function mythicrealms.setupCalendar
   * @memberof hookEvents
   * @returns {boolean|void} Explicitly return `false` to prevent calendar setup.
   */
  if (Hooks.call("mythicrealms.setupCalendar") === false) return;

  const calendar = game.settings.get("mythicrealms", "calendar");
  const calendarConfig = CONFIG.MYTHICREALMS.calendar.calendars.find(c => c.value === calendar);

  if (calendarConfig) {
    CONFIG.time.worldCalendarConfig = calendarConfig.config;
    if (calendarConfig.class) CONFIG.time.worldCalendarClass = calendarConfig.class;
  }
}

/**
 * Configure explicit lists of attributes that are trackable on the token HUD and in the combat tracker.
 * @internal
 */
function _configureTrackableAttributes() {
  const common = {
    bar: [],
    value: [
      ...Object.keys(MythicRealms.abilities ?? {}).map(ability => `abilities.${ability}.value`),
      ...Object.keys(MythicRealms.movementTypes ?? {}).map(movement => `attributes.movement.${movement}`),
      "attributes.ac.value",
      "attributes.init.total"
    ]
  };

  const creature = {
    bar: [
      ...common.bar,
      "attributes.hp",
      ..._trackedSpellAttributes()
    ],
    value: [
      ...common.value,
      ...Object.keys(MythicRealms.skills ?? {}).map(skill => `skills.${skill}.passive`),
      ...Object.keys(MythicRealms.senses ?? {}).map(sense => `attributes.senses.ranges.${sense}`),
      "attributes.hp.temp",
      "attributes.spell.attack",
      "attributes.spell.dc"
    ]
  };

  CONFIG.Actor.trackableAttributes = {
    character: {
      bar: [...creature.bar, "resources.primary", "resources.secondary", "resources.tertiary", "details.xp"],
      value: [...creature.value]
    },
    npc: {
      bar: [...creature.bar, "resources.legact", "resources.legres"],
      value: [...creature.value, "attributes.spell.level", "details.cr", "details.xp.value"]
    },
    vehicle: {
      bar: [...common.bar, "attributes.hp"],
      value: [...common.value]
    },
    group: {
      bar: [],
      value: []
    }
  };
}

/**
 * Get all trackable spell slot attributes.
 * @param {string} [suffix=""]  Suffix appended to the path.
 * @returns {Set<string>}
 * @internal
 */
function _trackedSpellAttributes(suffix = "") {
  const spellcasting = MythicRealms.spellcasting ?? {};
  const levelsCount = Math.max((Object.keys(MythicRealms.spellLevels ?? {}).length - 1), 0);

  return Object.entries(spellcasting).reduce((acc, [, v]) => {
    if (v?.slots) {
      Array.fromRange(levelsCount, 1).forEach(l => {
        acc.add(`spells.${v.getSpellSlotKey(l)}${suffix}`);
      });
    }
    return acc;
  }, new Set());
}

/**
 * Configure which attributes are available for item consumption.
 * @internal
 */
function _configureConsumableAttributes() {
  CONFIG.MYTHICREALMS.consumableResources = [
    ...Object.keys(MythicRealms.abilities ?? {}).map(ability => `abilities.${ability}.value`),
    "attributes.ac.flat",
    "attributes.hp.value",
    "attributes.exhaustion",
    ...Object.keys(MythicRealms.senses ?? {}).map(sense => `attributes.senses.ranges.${sense}`),
    ...Object.keys(MythicRealms.movementTypes ?? {}).map(type => `attributes.movement.${type}`),
    ...Object.keys(MythicRealms.currencies ?? {}).map(denom => `currency.${denom}`),
    "details.xp.value",
    "resources.primary.value",
    "resources.secondary.value",
    "resources.tertiary.value",
    "resources.legact.value",
    "resources.legres.value",
    "attributes.actions.value",
    ..._trackedSpellAttributes(".value")
  ];
}

/**
 * Configure additional system fonts.
 */
function _configureFonts() {
  Object.assign(CONFIG.fontDefinitions, {
    Cinzel: {
      editor: true,
      fonts: [
        { urls: ["systems/mythicrealms/fonts/Cinzel/Cinzel-Regular.ttf"] },
        { urls: ["systems/mythicrealms/fonts/Cinzel/Cinzel-Medium.ttf"], weight: "500" },
        { urls: ["systems/mythicrealms/fonts/Cinzel/Cinzel-SemiBold.ttf"], weight: "600" },
        { urls: ["systems/mythicrealms/fonts/Cinzel/Cinzel-Bold.ttf"], weight: "bold" },
        { urls: ["systems/mythicrealms/fonts/Cinzel/Cinzel-ExtraBold.ttf"], weight: "800" },
        { urls: ["systems/mythicrealms/fonts/Cinzel/Cinzel-Black.ttf"], weight: "900" }
      ]
    },

    "Libre Baskerville": {
      editor: true,
      fonts: [
        { urls: ["systems/mythicrealms/fonts/Libre-Baskerville/LibreBaskerville-Regular.ttf"] },
        { urls: ["systems/mythicrealms/fonts/Libre-Baskerville/LibreBaskerville-Italic.ttf"], style: "italic" },
        { urls: ["systems/mythicrealms/fonts/Libre-Baskerville/LibreBaskerville-Bold.ttf"], weight: "bold" },
        {
          urls: ["systems/mythicrealms/fonts/Libre-Baskerville/LibreBaskerville-BoldItalic.ttf"],
          weight: "bold",
          style: "italic"
        }
      ]
    },

    "Great Vibes": {
      editor: true,
      fonts: [
        { urls: ["systems/mythicrealms/fonts/Great-Vibes/GreatVibes-Regular.ttf"] }
      ]
    },

    "Dancing Script": {
      editor: true,
      fonts: [
        { urls: ["systems/mythicrealms/fonts/Dancing-Script/DancingScript-Regular.ttf"] },
        { urls: ["systems/mythicrealms/fonts/Dancing-Script/DancingScript-Medium.ttf"], weight: "500" },
        { urls: ["systems/mythicrealms/fonts/Dancing-Script/DancingScript-SemiBold.ttf"], weight: "600" },
        { urls: ["systems/mythicrealms/fonts/Dancing-Script/DancingScript-Bold.ttf"], weight: "bold" }
      ]
    }
  });
}

/**
 * Configure system status effects.
 */
function _configureStatusEffects() {
  const addEffect = (effects, { special, ...data }) => {
    data = foundry.utils.deepClone(data);
    data._id = utils.staticID(`mythicrealms${data.id}`);
    data.order ??= Infinity;
    effects.push(data);
    if (special) CONFIG.specialStatusEffects[special] = data.id;
    if (data.neverBlockMovement) MythicRealms.neverBlockStatuses?.add?.(data.id);
  };

  const statusEffectsConfig = CONFIG.MYTHICREALMS?.statusEffects ?? {};
  const conditionTypesConfig = CONFIG.MYTHICREALMS?.conditionTypes ?? {};
  const encumbranceEffectsConfig = CONFIG.MYTHICREALMS?.encumbrance?.effects ?? {};

  CONFIG.statusEffects = Object.entries(statusEffectsConfig).reduce((arr, [id, data]) => {
    const original = (CONFIG.statusEffects ?? []).find?.(s => s.id === id);
    addEffect(arr, foundry.utils.mergeObject(original ?? {}, { id, ...data }, { inplace: false }));
    return arr;
  }, []);

  for (const [id, data] of Object.entries(conditionTypesConfig)) {
    addEffect(CONFIG.statusEffects, { id, ...data });
  }

  for (const [id, data] of Object.entries(encumbranceEffectsConfig)) {
    addEffect(CONFIG.statusEffects, { id, ...data, hud: false });
  }
}

/* -------------------------------------------- */
/*  Bundled Module Exports                      */
/* -------------------------------------------- */

export {
  applications,
  canvas,
  dataModels,
  dice,
  documents,
  enrichers,
  Filter,
  migrations,
  registry,
  utils,
  MythicRealms
};