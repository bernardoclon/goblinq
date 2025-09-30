export class GMPanel extends Application {
    static #instance = null;

    constructor(options = {}) {
        super(options);
        GMPanel.#instance = this;
        // Subscribirse a cambios en las configuraciones
        this.#subscribeToSettings();
    }

    static getInstance() {
        return this.#instance;
    }

    /**
     * Create or show the GM Panel instance - prevents multiple instances
     * @returns {GMPanel} The singleton instance
     */
    static createOrShow() {
        if (this.#instance && this.#instance.rendered) {
            // Si ya existe y está renderizada, solo la traemos al frente
            this.#instance.bringToTop();
            return this.#instance;
        } else if (this.#instance) {
            // Si existe pero no está renderizada, la renderizamos
            this.#instance.render(true);
            return this.#instance;
        } else {
            // Si no existe, creamos una nueva instancia
            const panel = new GMPanel();
            panel.render(true);
            return panel;
        }
    }

    #subscribeToSettings() {
        // Hook para cambios en configuraciones globales
        Hooks.on("updateSetting", (setting) => {
            if (setting.key === "goblin-quest-system.globalTasks" && game.user.isGM) {
                this.render(true);
            }
        });

        // Hook para cuando se crea un nuevo actor
        Hooks.on("createActor", (actor) => {
            if (actor.type === "clan" && game.user.isGM) {
                console.log("GM Panel | New clan actor created:", actor.name);
                this.render(true);
            }
        });

        // Hook para cuando se elimina un actor
        Hooks.on("deleteActor", (actor) => {
            if (actor.type === "clan" && game.user.isGM) {
                console.log("GM Panel | Clan actor deleted:", actor.name);
                this.render(true);
            }
        });

        console.log("GM Panel | Event listeners registered for actor changes");
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "gm-task-panel",
            classes: ["goblin-quest", "gm-panel"],
            template: "systems/goblin-quest-system/templates/gm-panel.html",
            width: 400,
            height: "auto",
            title: "GM Task Panel",
            resizable: true
        });
    }

    getNumberOfActors() {
        return game.actors.filter(actor => actor.type === 'clan').length;
    }

    getData() {
        const settings = game.settings.get("goblin-quest-system", "globalTasks");
        const data = foundry.utils.deepClone(settings);

        const numActors = this.getNumberOfActors();

        for (let i = 1; i <= 3; i++) {
            const task = data.tasks[`task${i}`];
            for (let j = 1; j <= 3; j++) {
                const level = task.levels[`level${j}`];
                let numCheckboxes = 0;
                if (i === 1) {
                    numCheckboxes = Math.max(1, numActors - 1);
                } else if (i === 2) {
                    numCheckboxes = Math.max(1, numActors);
                } else {
                    numCheckboxes = Math.max(1, numActors + 1);
                }

                if (level.complication) {
                    numCheckboxes++;
                }

                const oldCheckboxStates = level.checkboxStates || [];
                if (oldCheckboxStates.length !== numCheckboxes) {
                    const newCheckboxStates = new Array(numCheckboxes).fill(false);
                    for (let k = 0; k < Math.min(oldCheckboxStates.length, numCheckboxes); k++) {
                        newCheckboxStates[k] = oldCheckboxStates[k];
                    }
                    level.checkboxStates = newCheckboxStates;
                }
                level.numCheckboxes = numCheckboxes;
            }
        }
        return { data };
    }

    activateListeners(html) {
        super.activateListeners(html);
        if (!game.user.isGM) return;

        // Text inputs and textareas
        html.find('input[type="text"], textarea').change(this._onSettingChange.bind(this));
        
        // Task checkboxes (exclude difficulty radio buttons)
        html.find('input[type="checkbox"]:not([name="difficulty"])').change(this._onCheckboxChange.bind(this));
        
        // Difficulty radio buttons with more specific handling
        html.find('input[type="radio"][name="difficulty"]').change(this._onDifficultyChange.bind(this));
        
        // Also listen for click events on difficulty radio buttons as backup
        html.find('input[type="radio"][name="difficulty"]').click(this._onDifficultyChange.bind(this));
        
        console.log("GM Panel listeners activated");
    }

    async _onSettingChange(event) {
        const input = event.currentTarget;
        const value = input.type === 'checkbox' ? input.checked : input.value;
        const settings = game.settings.get("goblin-quest-system", "globalTasks");
        const newSettings = foundry.utils.deepClone(settings);
        foundry.utils.setProperty(newSettings, input.name, value);
        await game.settings.set("goblin-quest-system", "globalTasks", newSettings);
    }

    async _onCheckboxChange(event) {
        await this._onSettingChange(event);
        if (event.currentTarget.name.includes("complication")) {
            this.render();
        }
    }

    async _onDifficultyChange(event) {
        event.preventDefault();
        const input = event.currentTarget;
        
        // Only process if the radio button is actually checked
        if (!input.checked) return;
        
        try {
            const settings = game.settings.get("goblin-quest-system", "globalTasks");
            const newSettings = foundry.utils.deepClone(settings);
            newSettings.difficulty = input.value;
            
            await game.settings.set("goblin-quest-system", "globalTasks", newSettings);
            
            console.log("Difficulty updated to:", input.value);
            
        } catch (error) {
            console.error("Error updating difficulty:", error);
        }
    }

    /**
     * Override close method to clean up singleton instance
     * @param {object} options - Close options
     * @returns {Promise<void>}
     */
    async close(options = {}) {
        const result = await super.close(options);
        // Limpiar la instancia singleton cuando se cierra
        if (GMPanel.#instance === this) {
            GMPanel.#instance = null;
            console.log("GM Panel | Instance cleared");
        }
        return result;
    }
}