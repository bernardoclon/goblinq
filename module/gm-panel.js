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

    #subscribeToSettings() {
        Hooks.on("updateSetting", (setting) => {
            if (setting.key === "goblin-quest-system.globalTasks" && game.user.isGM) {
                this.render(true);
            }
        });
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

        html.find('input[type="text"], textarea').change(this._onSettingChange.bind(this));
        html.find('input[type="checkbox"]').change(this._onCheckboxChange.bind(this));
        html.find('input[type="radio"][name="difficulty"]').change(this._onDifficultyChange.bind(this));
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
        const input = event.currentTarget;
        const settings = game.settings.get("goblin-quest-system", "globalTasks");
        const newSettings = foundry.utils.deepClone(settings);
        newSettings.difficulty = input.value;
        await game.settings.set("goblin-quest-system", "globalTasks", newSettings);
    }
}