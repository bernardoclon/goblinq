// module/goblin-quest-system.js
// Importa la clase de la hoja de actor personalizada.
// Las clases de Foundry VTT como ActorSheet, loadTemplates, y Actors son globales o se acceden vía 'foundry.'
// No requieren una declaración de importación con rutas de módulo como "foundry.appv1.sheets.ActorSheet".
import { GoblinQuestActorSheet } from "./sheets/goblin-quest-actor-sheet.js";

// Define un ID para el sistema, utilizado para configuraciones.
const SYSTEM_ID = "goblin-quest-system";

// Mapa para almacenar los intervalos de reintentos activos para los banners de compendio.
const bannersBeingApplied = new Set();


// Hook 'init' se ejecuta cuando Foundry VTT está inicializando el sistema.
Hooks.once("init", async function() {
    console.log("Goblin Quest System | Inicializando el sistema...");

    // Cargar las plantillas HTML del sistema.
    // Acceder a 'loadTemplates' directamente desde el namespace 'foundry.applications.handlebars'
    await foundry.applications.handlebars.loadTemplates([
        "systems/goblin-quest-system/templates/actor-sheet.html"
        // Si tuvieras hojas de items o de otro tipo, las agregarías aquí.
        // Ejemplo: "systems/goblin-quest-system/templates/item-sheet.html"
    ]);

    // Registrar las hojas de personaje personalizadas.
    // Acceder a 'Actors' y 'ActorSheet' desde sus namespaces globales.
    foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);

    // Luego, registramos nuestra hoja personalizada.
    foundry.documents.collections.Actors.registerSheet("goblin-quest-system", GoblinQuestActorSheet, {
        types: ["clan"], // Especifica qué tipos de actores usarán esta hoja (definido en template.json).
        makeDefault: true, // Establece esta hoja como la predeterminada para el tipo 'clan'.
        label: "Hoja de Clan Goblin" // Etiqueta que aparecerá en el selector de hojas.
    });

    // Registra el helper 'range' para Handlebars.
    // Usado para iterar sobre un rango de números en el template (ej. para generar checkboxes de dados).
    // Generará números desde 'from' hasta 'to - 1' inclusive.
    Handlebars.registerHelper('range', function(from, to) {
        const result = [];
        for (let i = from; i < to; i++) {
            result.push(i);
        }
        return result;
    });

    // Registra el helper 'add' para Handlebars.
    // Usado para sumar números directamente en el template.
    Handlebars.registerHelper('add', function(a, b) {
        return a + b;
    });

    // Registra el helper 'lt' (less than) para Handlebars.
    // Usado para comparar valores en el template (ej. para determinar si un checkbox debe estar marcado).
    Handlebars.registerHelper('lt', function(a, b) {
        return a < b;
    });

    // Registra el helper 'eq' (equals) para Handlebars.
    // Usado para comparar valores en el template (ej. para seleccionar opciones en un dropdown).
    Handlebars.registerHelper('eq', function(a, b) {
        return a === b;
    });

    // Registra el helper 'isGreaterThan' para Handlebars.
    // Usado para comparar si un número es mayor que otro.
    Handlebars.registerHelper('isGreaterThan', function(a, b) {
        return a > b;
    });

});

// Hook 'setup' se ejecuta después de 'init' y antes de que se carguen los datos del juego.
// Es un buen lugar para configurar los modelos de datos personalizados.
Hooks.once("setup", function() {
    console.log("Goblin Quest System | Configurando modelos de datos...");

    // Importar 'fields' para definir el esquema de los modelos de datos en Foundry VTT 13+.
    const { fields } = foundry.data;

    /**
     * Define el modelo de datos para el Actor 'clan'.
     * En Foundry VTT 13+, los modelos de datos son clases que extienden DataModel.
     */
    class ClanDataModel extends foundry.abstract.TypeDataModel {
        static defineSchema() {
            return {
                details: new fields.SchemaField({
                    clanName: new fields.StringField({ required: true, initial: "" }),
                    dream: new fields.StringField({ required: true, initial: "" }),
                    rarity: new fields.StringField({ required: true, initial: "" }),
                    expertise: new fields.StringField({ required: true, initial: "" }),
                    relicName: new fields.StringField({ required: true, initial: "" })
                }),
                // CORRECCIÓN PRINCIPAL: Asegurar que cada goblin es un SchemaField completo
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
                    value: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
                    max: new fields.NumberField({ required: true, integer: true, initial: 10, min: 0 })
                }),
                diceModifier: new fields.NumberField({ required: true, integer: true, initial: 0 }),
                objective: new fields.StringField({ required: true, initial: "" }),
                tasks: new fields.SchemaField({
                    task1: new fields.SchemaField({
                        name: new fields.StringField({ required: true, initial: "" }),
                        levels: new fields.SchemaField({
                            // CORRECCIÓN APLICADA AQUÍ: level1 ahora es un SchemaField
                            level1: new fields.SchemaField({
                                challenge: new fields.NumberField({ required: true, integer: true, initial: 3, min: 3, max: 4 }),
                                checkboxStates: new fields.ArrayField(new fields.BooleanField({ initial: false }), { required: true, initial: [false, false, false, false] })
                            }),
                            level2: new fields.SchemaField({ 
                                challenge: new fields.NumberField({ required: true, integer: true, initial: 3, min: 3, max: 4 }),
                                checkboxStates: new fields.ArrayField(new fields.BooleanField({ initial: false }), { required: true, initial: [false, false, false, false] })
                            }),
                            level3: new fields.SchemaField({
                                challenge: new fields.NumberField({ required: true, integer: true, initial: 3, min: 3, max: 4 }),
                                checkboxStates: new fields.ArrayField(new fields.BooleanField({ initial: false }), { required: true, initial: [false, false, false, false] })
                            })
                        })
                    }),
                    task2: new fields.SchemaField({
                        name: new fields.StringField({ required: true, initial: "" }),
                        levels: new fields.SchemaField({
                            level1: new fields.SchemaField({
                                challenge: new fields.NumberField({ required: true, integer: true, initial: 3, min: 3, max: 4 }),
                                checkboxStates: new fields.ArrayField(new fields.BooleanField({ initial: false }), { required: true, initial: [false, false, false, false] })
                            }),
                            level2: new fields.SchemaField({
                                challenge: new fields.NumberField({ required: true, integer: true, initial: 3, min: 3, max: 4 }),
                                checkboxStates: new fields.ArrayField(new fields.BooleanField({ initial: false }), { required: true, initial: [false, false, false, false] })
                            }),
                            level3: new fields.SchemaField({
                                challenge: new fields.NumberField({ required: true, integer: true, initial: 3, min: 3, max: 4 }),
                                checkboxStates: new fields.ArrayField(new fields.BooleanField({ initial: false }), { required: true, initial: [false, false, false, false] })
                            })
                        })
                    }),
                    task3: new fields.SchemaField({
                        name: new fields.StringField({ required: true, initial: "" }),
                        levels: new fields.SchemaField({
                            level1: new fields.SchemaField({ // Corregido: Ahora es un SchemaField
                                challenge: new fields.NumberField({ required: true, integer: true, initial: 3, min: 3, max: 4 }),
                                checkboxStates: new fields.ArrayField(new fields.BooleanField({ initial: false }), { required: true, initial: [false, false, false, false] })
                            }),
                            level2: new fields.SchemaField({
                                challenge: new fields.NumberField({ required: true, integer: true, initial: 3, min: 3, max: 4 }),
                                checkboxStates: new fields.ArrayField(new fields.BooleanField({ initial: false }), { required: true, initial: [false, false, false, false] })
                            }),
                            level3: new fields.SchemaField({
                                challenge: new fields.NumberField({ required: true, integer: true, initial: 3, min: 3, max: 4 }),
                                checkboxStates: new fields.ArrayField(new fields.BooleanField({ initial: false }), { required: true, initial: [false, false, false, false] })
                            })
                        })
                    })
                })
            };
        }
    }

    // Registra la clase del modelo de datos para el tipo de Actor 'clan'.
    CONFIG.Actor.dataModels.clan = ClanDataModel;

    /**
     * Define el modelo de datos para el Item 'basic'.
     */
    class BasicItemDataModel extends foundry.abstract.TypeDataModel {
        static defineSchema() {
            return {
                value: new fields.NumberField({ required: true, initial: 0 })
            };
        }
    }

    // Registra la clase del modelo de datos para el tipo de Item 'basic'.
    CONFIG.Item.dataModels.basic = BasicItemDataModel;
});


// Hook 'ready' se ejecuta una vez que Foundry VTT está completamente cargado y listo para interactuar.
// Aquí puedes añadir lógica adicional que dependa de que el juego esté completamente funcional.
Hooks.once("ready", async function() {
    console.log("Goblin Quest System | Sistema listo.");

    // --- Observador global del DOM para detectar ventanas emergentes ---
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
    // --- FIN Observador global del DOM ---

    // La lógica para aplicar el logo de pausa al inicio se ha eliminado.
});

// --- FUNCIÓN: Aplica el banner a una ventana emergente de compendio ---
function applyCompendiumBanner(popoutSection) {
    const popoutId = popoutSection.id;

    console.log(`${SYSTEM_ID} | DEBUG: applyCompendiumBanner: Procesando ventana emergente de compendio: ${popoutId}`);
    
    // Aquí usamos un mapa directo para compendiumThemes, esto debería coincidir con tu module.js si es un módulo separado.
    // Para un sistema, los paths de los banners deberían ser relativos al sistema.
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