// module/goblin-quest-system.js
// Import the custom actor sheet class.
// Foundry VTT classes like ActorSheet, loadTemplates, and Actors are global or accessed via 'foundry.'
// They do not require an import declaration with module paths like "foundry.appv1.sheets.ActorSheet".
import { GoblinQuestActorSheet } from "./sheets/goblin-quest-actor-sheet.js";
import { GMPanel } from "./gm-panel.js";

// Define a system ID, used for settings.
const SYSTEM_ID = "goblin-quest-system";

// Map to store active retry intervals for compendium banners.
const bannersBeingApplied = new Set();


// 'init' hook runs when Foundry VTT is initializing the system.
Hooks.once("init", async function() {
    console.log("Goblin Quest System | Inicializando el sistema...");

    // Load the system's HTML templates.
    // Access 'loadTemplates' directly from the 'foundry.applications.handlebars' namespace
    await foundry.applications.handlebars.loadTemplates([
        "systems/goblin-quest-system/templates/actor-sheet.html",
        "systems/goblin-quest-system/templates/gm-panel.html"
    ]);

    // Register the custom character sheets.
    // Access 'Actors' and 'ActorSheet' from their global namespaces.
    foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);

    foundry.documents.collections.Actors.registerSheet("goblin-quest-system", GoblinQuestActorSheet, {
        types: ["clan"], // Specifies which actor types will use this sheet (defined in template.json).
        makeDefault: true, // Sets this sheet as the default for the 'clan' type.
        label: "Goblin Clan Sheet" // Label that will appear in the sheet selector.
    });

    game.settings.register("goblin-quest-system", "globalTasks", {
        name: "Global Tasks",
        scope: "world",
        config: false,
        type: Object,
        default: {
            objective: "",
            difficulty: "normal",
            tasks: {
                task1: {
                    name: "",
                    levels: {
                        level1: { name: "Nivel 1", complication: false },
                        level2: { name: "Nivel 2", complication: false },
                        level3: { name: "Nivel 3", complication: false }
                    }
                },
                task2: {
                    name: "",
                    levels: {
                        level1: { name: "Nivel 1", complication: false },
                        level2: { name: "Nivel 2", complication: false },
                        level3: { name: "Nivel 3", complication: false }
                    }
                },
                task3: {
                    name: "",
                    levels: {
                        level1: { name: "Nivel 1", complication: false },
                        level2: { name: "Nivel 2", complication: false },
                        level3: { name: "Nivel 3", complication: false }
                    }
                }
            }
        }
    });

    // Register the 'range' helper for Handlebars.
    // Used to iterate over a range of numbers in the template (e.g., to generate dice checkboxes).
    // It will generate numbers from 'from' to 'to - 1' inclusive.
    Handlebars.registerHelper('range', function(from, to) {
        const result = [];
        for (let i = from; i < to; i++) {
            result.push(i);
        }
        return result;
    });

    // Register the 'add' helper for Handlebars.
    // Used to add numbers directly in the template.
    Handlebars.registerHelper('add', function(a, b) {
        return a + b;
    });

    // Register the 'lt' (less than) helper for Handlebars.
    // Used to compare values in the template (e.g., to determine if a checkbox should be checked).
    Handlebars.registerHelper('lt', function(a, b) {
        return a < b;
    });

    // Register the 'eq' (equals) helper for Handlebars.
    // Used to compare values in the template (e.g., to select options in a dropdown).
    Handlebars.registerHelper('eq', function(a, b) {
        return a === b;
    });

    // Register the 'isGreaterThan' helper for Handlebars.
    // Used to compare if one number is greater than another.
    Handlebars.registerHelper('isGreaterThan', function(a, b) {
        return a > b;
    });

});

// 'ready' hook to configure sockets after the game is ready
Hooks.once("ready", function() {
    // Configure socket for communication between players and GM
    game.socket.on("system.goblin-quest-system", async (data) => {
        // Only the GM can update global settings
        if (!game.user.isGM) return;
        
        console.log("Goblin Quest System | Socket recibido:", data);
        
        if (data.type === "updateDifficulty") {
            try {
                const settings = game.settings.get("goblin-quest-system", "globalTasks");
                const newSettings = foundry.utils.deepClone(settings);
                newSettings.difficulty = data.difficulty;
                await game.settings.set("goblin-quest-system", "globalTasks", newSettings);
                
                console.log(`Goblin Quest System | Dificultad actualizada a "${data.difficulty}" por ${data.user}`);
            } catch (error) {
                console.error("Goblin Quest System | Error actualizando dificultad:", error);
                ui.notifications.error("Error al actualizar la dificultad");
            }
        }
    });
});

// 'setup' hook runs after 'init' and before game data is loaded.
// It's a good place to configure custom data models.
Hooks.once("setup", function() {
    console.log("Goblin Quest System | Configurando modelos de datos...");

    // Import 'fields' to define the data model schema in Foundry VTT 13+.
    const { fields } = foundry.data;

    /**
     * Defines the data model for the 'clan' Actor.
     * In Foundry VTT 13+, data models are classes that extend DataModel.
     */
    class ClanDataModel extends foundry.abstract.TypeDataModel {
        static defineSchema() {
            return {
                description: new fields.HTMLField({ required: true, initial: "" }),
                details: new fields.SchemaField({
                    clanName: new fields.StringField({ required: true, initial: "" }),
                    dream: new fields.StringField({ required: true, initial: "" }),
                    rarity: new fields.StringField({ required: true, initial: "" }),
                    expertise: new fields.StringField({ required: true, initial: "" }),
                    relicName: new fields.StringField({ required: true, initial: "" })
                }),
                // MAIN FIX: Ensure each goblin is a complete SchemaField
                goblins: new fields.SchemaField({
                    goblin1: new fields.SchemaField({
                        name: new fields.StringField({ required: true, initial: "" }),
                        img: new fields.StringField({ required: true, initial: "icons/svg/mystery-man.svg" }),
                        feature: new fields.StringField({ required: true, initial: "" }),
                        causeOfDeath: new fields.StringField({ required: true, initial: "" }),
                        health: new fields.SchemaField({
                            hp1: new fields.BooleanField({ required: true, initial: false }),
                            hp2: new fields.BooleanField({ required: true, initial: false })
                        })
                    }),
                    goblin2: new fields.SchemaField({
                        name: new fields.StringField({ required: true, initial: "" }),
                        img: new fields.StringField({ required: true, initial: "icons/svg/mystery-man.svg" }),
                        feature: new fields.StringField({ required: true, initial: "" }),
                        causeOfDeath: new fields.StringField({ required: true, initial: "" }),
                        health: new fields.SchemaField({
                            hp1: new fields.BooleanField({ required: true, initial: false }),
                            hp2: new fields.BooleanField({ required: true, initial: false })
                        })
                    }),
                    goblin3: new fields.SchemaField({
                        name: new fields.StringField({ required: true, initial: "" }),
                        img: new fields.StringField({ required: true, initial: "icons/svg/mystery-man.svg" }),
                        feature: new fields.StringField({ required: true, initial: "" }),
                        causeOfDeath: new fields.StringField({ required: true, initial: "" }),
                        health: new fields.SchemaField({
                            hp1: new fields.BooleanField({ required: true, initial: false }),
                            hp2: new fields.BooleanField({ required: true, initial: false })
                        })
                    }),
                    goblin4: new fields.SchemaField({
                        name: new fields.StringField({ required: true, initial: "" }),
                        img: new fields.StringField({ required: true, initial: "icons/svg/mystery-man.svg" }),
                        feature: new fields.StringField({ required: true, initial: "" }),
                        causeOfDeath: new fields.StringField({ required: true, initial: "" }),
                        health: new fields.SchemaField({
                            hp1: new fields.BooleanField({ required: true, initial: false }),
                            hp2: new fields.BooleanField({ required: true, initial: false })
                        })
                    }),
                    goblin5: new fields.SchemaField({
                        name: new fields.StringField({ required: true, initial: "" }),
                        img: new fields.StringField({ required: true, initial: "icons/svg/mystery-man.svg" }),
                        feature: new fields.StringField({ required: true, initial: "" }),
                        causeOfDeath: new fields.StringField({ required: true, initial: "" }),
                        health: new fields.SchemaField({
                            hp1: new fields.BooleanField({ required: true, initial: false }),
                            hp2: new fields.BooleanField({ required: true, initial: false })
                        })
                    })
                }),
                dicePool: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, integer: true, initial: 1, min: 1 })
                }),
                diceModifier: new fields.NumberField({ required: true, integer: true, initial: 0 })
            };
        }
    }

    // Register the data model class for the 'clan' Actor type.
    CONFIG.Actor.dataModels.clan = ClanDataModel;

    /**
     * Defines the data model for the 'basic' Item.
     */
    class BasicItemDataModel extends foundry.abstract.TypeDataModel {
        static defineSchema() {
            return {
                value: new fields.NumberField({ required: true, initial: 0 })
            };
        }
    }

    // Register the data model class for the 'basic' Item type.
    CONFIG.Item.dataModels.basic = BasicItemDataModel;
});


// 'ready' hook runs once Foundry VTT is fully loaded and ready to interact.
// Here you can add additional logic that depends on the game being fully functional.
Hooks.once("ready", async function() {
    console.log("Goblin Quest System | Sistema listo.");

    // --- Global DOM observer to detect pop-up windows ---
    console.log(`${SYSTEM_ID} | DEBUG GLOBAL: Iniciando observador global del DOM en document.body para detectar ventanas emergentes.`);
    const globalBodyObserver = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const popoutSection = node.matches('section[id^="compendium-"].sidebar-popout') ? node : node.querySelector('section[id^="compendium-"].sidebar-popout');
                        
                        if (popoutSection && !bannersBeingApplied.has(popoutSection.id)) {
                            console.log(`${SYSTEM_ID} | DEBUG GLOBAL: Detectada posible ventana emergente de compendio para banner: ${popoutSection.id}`);
                            bannersBeingApplied.add(popoutSection.id); 
                            applyCompendiumBanner(popoutSection); 
                        }
                    }
                }
            }
        }
    });
    globalBodyObserver.observe(document.body, { childList: true, subtree: true });
    // --- END Global DOM observer ---

    // The logic to apply the pause logo on startup has been removed.
});

// --- FUNCTION: Applies the banner to a compendium pop-up window ---
function applyCompendiumBanner(popoutSection) {
    const popoutId = popoutSection.id;

    console.log(`${SYSTEM_ID} | DEBUG: applyCompendiumBanner: Procesando ventana emergente de compendio: ${popoutId}`);
    
    // Here we use a direct map for compendiumThemes, this should match your module.js if it's a separate module.
    // For a system, banner paths should be relative to the system.
    const compendiumThemesMap = new Map([
        [`${SYSTEM_ID}.1-disciplinas-magia-y-dones`, `systems/${SYSTEM_ID}/art/banner1.png`], 
        [`${SYSTEM_ID}.2-clanes-tribus-y-estirpes`, `systems/${SYSTEM_ID}/art/banner2.jpg`],
        [`${SYSTEM_ID}.3-meritos-defectos-y-trasfondos`, `systems/${SYSTEM_ID}/art/banner3.jpg`],
        [`${SYSTEM_ID}.4-antagonistas-y-bestiario`, `systems/${SYSTEM_ID}/art/banner4.jpg`]
    ]);

    const dataPackIdForPopout = popoutId.replace('compendium-', '').replace(/_/g, '.'); 
    const customBannerImage = compendiumThemesMap.get(dataPackIdForPopout);
    
    if (customBannerImage) {
      const mainBannerImg = popoutSection.querySelector('.header-banner img');
      
      if (mainBannerImg) {
        const absoluteCustomBannerImage = new URL(customBannerImage, window.location.href).href;
        console.log(`${SYSTEM_ID} | DEBUG: applyCompendiumBanner: customBannerImage original: ${customBannerImage}`);
        console.log(`${SYSTEM_ID} | DEBUG: applyCompendiumBanner: absoluteCustomBannerImage para comparación: ${absoluteCustomBannerImage}`);

        let attempts = 0;
        const maxAttempts = 20; 
        const intervalTime = 75; 

        const trySetBanner = () => {
            attempts++;
            console.log(`${SYSTEM_ID} | DEBUG: applyCompendiumBanner: Intento #${attempts} para ${popoutId}.`);

            if (mainBannerImg.hasAttribute('loading')) {
                mainBannerImg.removeAttribute('loading');
                console.log(`${SYSTEM_ID} | DEBUG: applyCompendiumBanner: Atributo 'loading' removido.`);
            }

            if (mainBannerImg.src !== absoluteCustomBannerImage) {
                mainBannerImg.setAttribute('src', customBannerImage); 
                console.log(`${SYSTEM_ID} | DEBUG: applyCompendiumBanner: Atributo src forzado para ${popoutId}: ${customBannerImage}`);
            } else {
                console.log(`${SYSTEM_ID} | DEBUG: applyCompendiumBanner: Banner establecido y confirmado para ${popoutId}. Deteniendo reintentos.`);
                bannersBeingApplied.delete(popoutId);
                return; 
            }

            if (attempts < maxAttempts) {
                setTimeout(trySetBanner, intervalTime);
            } else {
                console.log(`${SYSTEM_ID} | DEBUG: applyCompendiumBanner: Máximo de intentos (${maxAttempts}) alcanzado para ${popoutId}.`);
                bannersBeingApplied.delete(popoutId);
            }
        };
        trySetBanner();

      } else {
        console.log(`${SYSTEM_ID} | applyCompendiumBanner: No se encontró 'img' dentro de '.header-banner' en la ventana emergente para ${dataPackIdForPopout}.`);
        bannersBeingApplied.delete(popoutId);
      }
    } else {
      console.log(`${SYSTEM_ID} | applyCompendiumBanner: No hay banner personalizado definido para la ventana emergente: ${dataPackIdForPopout}.`);
      bannersBeingApplied.delete(popoutId);
    }
}

Hooks.on('renderActorDirectory', (app, html, data) => {
    if (!game.user.isGM) return;

    const button = $(`<button class="gm-task-panel-btn"><i class="fas fa-tasks"></i> GM Task Panel</button>`);
    button.on('click', () => {
        GMPanel.createOrShow();
    });

    $(html).find('.directory-header').append(button);
});