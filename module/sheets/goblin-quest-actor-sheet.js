/**
 * Extends the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
// No es necesario importar ActorSheet directamente con una ruta de módulo.
// ActorSheet es una clase global de Foundry VTT, accesible a través de foundry.appv1.sheets.ActorSheet.

export class GoblinQuestActorSheet extends foundry.appv1.sheets.ActorSheet {

    constructor(...args) {
        super(...args);
        
        // Estado de la vista actual (para mantenerlo durante re-renders)
        this._currentView = 'character-view';
        
        // Subscribirse a cambios en las configuraciones globales para actualización en tiempo real
        this._subscribeToGlobalTasksSettings();
    }

    /**
     * Subscribe to global tasks settings changes to update the sheet in real time
     * @private
     */
    _subscribeToGlobalTasksSettings() {
        Hooks.on("updateSetting", (setting) => {
            if (setting.key === "goblin-quest-system.globalTasks") {
                // Actualizar suavemente sin parpadeo si está en vista de tareas
                if (this.rendered && this.element.is(":visible")) {
                    this._smoothUpdateTasks();
                }
            }
        });
    }

    /**
     * Update tasks directly without any re-rendering - zero flickering
     * @private
     */
    _smoothUpdateTasks() {
        const tasksSection = document.getElementById('tasks-section');
        const tasksPanel = this.element.find('.readonly-tasks-panel');
        
        // Si no estamos en vista de tareas, usar re-render normal
        if (!tasksSection || tasksSection.hidden || tasksPanel.length === 0) {
            this._saveCurrentViewState();
            this.render(false);
            return;
        }

        try {
            // Obtener los datos actualizados directamente
            const globalTasks = game.settings.get("goblin-quest-system", "globalTasks") || {
                objective: "",
                tasks: {
                    task1: { name: "", levels: {} },
                    task2: { name: "", levels: {} },
                    task3: { name: "", levels: {} }
                }
            };
            
            // Actualizar objetivo
            const objectiveTextarea = tasksPanel.find('.objective-title textarea');
            if (objectiveTextarea.length > 0 && objectiveTextarea.val() !== globalTasks.objective) {
                objectiveTextarea.val(globalTasks.objective || '');
            }
            
            // Actualizar cada tarea
            this._updateTaskDirectly(tasksPanel, 1, globalTasks.tasks.task1 || {});
            this._updateTaskDirectly(tasksPanel, 2, globalTasks.tasks.task2 || {});
            this._updateTaskDirectly(tasksPanel, 3, globalTasks.tasks.task3 || {});
            
            console.log("Tasks updated with zero flickering");
            
        } catch (error) {
            console.warn("Direct update failed, falling back to normal render:", error);
            this._saveCurrentViewState();
            this.render(false);
        }
    }

    /**
     * Update a specific task directly in the DOM
     * @private
     */
    _updateTaskDirectly(tasksPanel, taskNumber, taskData) {
        const taskContainer = tasksPanel.find(`.task-column`).eq(taskNumber - 1);
        if (taskContainer.length === 0) return;
        
        // Update task name
        const taskNameInput = taskContainer.find('.task-name input');
        if (taskNameInput.length > 0 && taskNameInput.val() !== (taskData.name || '')) {
            taskNameInput.val(taskData.name || '');
        }
        
        // Update each level
        ['level1', 'level2', 'level3'].forEach((levelKey, levelIndex) => {
            const levelData = taskData.levels?.[levelKey] || {};
            const levelContainer = taskContainer.find('.task-level-container').eq(levelIndex);
            
            if (levelContainer.length === 0) return;
            
            // Update level name
            const levelInput = levelContainer.find('.task-level-label');
            if (levelInput.length > 0 && levelInput.val() !== (levelData.name || '')) {
                levelInput.val(levelData.name || '');
            }
            
            // Update checkboxes state
            const checkboxes = levelContainer.find('.checkbox-group input[type="checkbox"]');
            const checkboxStates = levelData.checkboxStates || {};
            
            checkboxes.each((index, checkbox) => {
                const $checkbox = $(checkbox);
                const shouldBeChecked = checkboxStates[index] || false;
                if ($checkbox.prop('checked') !== shouldBeChecked) {
                    $checkbox.prop('checked', shouldBeChecked);
                }
            });
            
            // Update complication checkbox (updated selector for new structure)
            const complicationCheckbox = levelContainer.find('.complication-section input[type="checkbox"]');
            if (complicationCheckbox.length > 0) {
                const shouldBeChecked = levelData.complication || false;
                if (complicationCheckbox.prop('checked') !== shouldBeChecked) {
                    complicationCheckbox.prop('checked', shouldBeChecked);
                }
            }
        });
    }

    /**
     * Save current view state before re-rendering
     * @private
     */
    _saveCurrentViewState() {
        const button = this.element.find('.single-view-toggle')[0];
        if (button) {
            this._currentView = button.dataset.current || 'character-view';
        }
    }

    /**
     * Restore view state after render
     * @private
     */
    _restoreViewState() {
        if (this._currentView === 'tasks-view') {
            const button = this.element.find('.single-view-toggle');
            const characterSection = document.getElementById('character-section');
            const tasksSection = document.getElementById('tasks-section');
            
            if (characterSection && tasksSection) {
                // Switch to tasks view
                characterSection.hidden = true;
                tasksSection.hidden = false;
                button.attr('data-current', 'tasks-view');
                button.attr('title', 'Ver Personaje');
                button.html('<i class="fas fa-user"></i>');
                
                console.log('Restored tasks view state');
            }
        }
    }

    /**
     * Set view state programmatically
     * @param {string} viewName - The view to activate ('character-view' or 'tasks-view')
     * @private
     */
    _setViewState(viewName) {
        const button = this.element.find('.single-view-toggle')[0];
        if (!button) return;

        // Remove active class from all views
        this.element.find('.view-section').removeClass('active');
        
        // Add active class to the target view
        this.element.find(`.${viewName}`).addClass('active');
        
        // Update the button's data attribute
        button.dataset.current = viewName;
        
        // Update button icon and tooltip
        const icon = button.querySelector('i');
        if (viewName === 'tasks-view') {
            icon.className = 'fas fa-users';
            button.title = 'Ver Personaje';
        } else {
            icon.className = 'fas fa-tasks';
            button.title = 'Ver Tareas';
        }
        
        // Update internal state
        this._currentView = viewName;
        
        console.log(`View state restored to: ${viewName}`);
    }

    /** @override */
    static get defaultOptions() {
        // Usar foundry.utils.mergeObject para compatibilidad futura
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["goblin-quest", "sheet", "actor"],
            template: "systems/goblin-quest-system/templates/actor-sheet.html",
            width: 400, // Ancho inicial de la hoja
            height: 750, // Reducido para mejor adaptación inicial
            tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "details"}] // Cambiado a 'details' para una pestaña más genérica
        });
    }

    /** @override */
    getData() {
        const data = super.getData();

        // Obtener una copia mutable de los datos del sistema del actor,
        // asegurándose de que si es un actor nuevo y `data.actor.system` no está completamente poblado,
        // se use el esquema por defecto del prototipo del actor.
        // Acceder a this.actor.system directamente ya que super.getData() debería inicializarlo.
        let systemData = foundry.utils.deepClone(this.actor.system);

        // Obtener los datos de tareas globales para la vista de tareas
        const globalTasksSettings = game.settings.get("goblin-quest-system", "globalTasks");
        const globalTasks = foundry.utils.deepClone(globalTasksSettings);

        // Calcular el número de actores para los checkboxes
        const numActors = game.actors.filter(actor => actor.type === 'clan').length;

        // Procesar los datos de tareas para calcular numCheckboxes
        for (let i = 1; i <= 3; i++) {
            const task = globalTasks.tasks[`task${i}`];
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

        // Asegurarse de que la estructura completa de los detalles del clan, goblins, tareas y niveles exista y
        // establecer valores predeterminados si faltan.

        // Initialize system.details if not present or incomplete
        if (!systemData.details) {
            systemData.details = {};
        }
        // Ensure all detail fields are initialized as strings
        if (typeof systemData.details.clanName !== 'string') {
            systemData.details.clanName = "";
        }
        if (typeof systemData.details.dream !== 'string') {
            systemData.details.dream = "";
        }
        if (typeof systemData.details.rarity !== 'string') {
            systemData.details.rarity = "";
        }
        if (typeof systemData.details.expertise !== 'string') {
            systemData.details.expertise = "";
        }
        if (typeof systemData.details.relicName !== 'string') {
            systemData.details.relicName = "";
        }

        // Initialize goblins and their health if not present or incomplete
        if (!systemData.goblins) systemData.goblins = {};
        for (let i = 1; i <= 5; i++) {
            const goblinKey = `goblin${i}`;
            if (!systemData.goblins[goblinKey]) {
                systemData.goblins[goblinKey] = {
                    name: "",
                    img: "icons/svg/mystery-man.svg",
                    health: { hp1: false, hp2: false }
                };
            }
            // Asegurarse de que la propiedad 'name' del goblin esté inicializada como una cadena
            if (typeof systemData.goblins[goblinKey].name !== 'string') {
                systemData.goblins[goblinKey].name = "";
            }
        }

        // Initialize dicePool if not present or incomplete
        if (!systemData.dicePool) {
            systemData.dicePool = { value: 0, max: 10 };
        }
        // Ensure dicePool.max is a number and has a default
        if (typeof systemData.dicePool.max !== 'number') {
            systemData.dicePool.max = 10; // Default max value
        }
        // Ensure dicePool.value is a number and within bounds
        if (typeof systemData.dicePool.value !== 'number' || systemData.dicePool.value < 0 || systemData.dicePool.value > systemData.dicePool.max) {
            systemData.dicePool.value = 0; // Default or reset if invalid
        }

        data.system = systemData; // Asignamos los datos procesados a data.system
        data.globalTasks = globalTasks; // Agregar datos de tareas globales

        console.log("getData() | Final processed data.system:", foundry.utils.deepClone(data.system));
        return data;
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        // Restore view state after re-render
        this._restoreViewState();

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;

        // Listener for the dice pool checkboxes
        html.find('.dice-pool .checkbox-group input[type="checkbox"]').change(this._onDicePoolChange.bind(this));

        // Listener for goblin health checkboxes - SIMPLIFICADO
        // Foundry VTT maneja la actualización directamente con el atributo 'name' del input
        html.find('.goblin-health .checkbox-group input[type="checkbox"]').change(this._onGoblinHealthChange.bind(this));

        // Roll button listener
        html.find('.roll-button').click(this._onRollButtonClick.bind(this));

        // Single view toggle listener
        html.find('.single-view-toggle').click(this._onSingleViewToggle.bind(this));
    }

    /**
     * Handle changes to the dice pool checkboxes.
     * Simply updates the DOM, the actor update will happen on form submission.
     * @param {Event} event The change event.
     * @private
     */
    async _onDicePoolChange(event) {
        const checkbox = event.currentTarget;
        const group = checkbox.closest('.checkbox-group');
        
        // Obtener todos los checkboxes del grupo
        const checkboxes = $(group).find('input[type="checkbox"]');
        const clickedIdx = parseInt(checkbox.dataset.idx, 10); // 1-based index from HTML

        if (checkbox.checked) {
            // Si este checkbox fue marcado, marca todos los checkboxes anteriores (incluido este)
            for (let i = 0; i <= clickedIdx; i++) { // Cambiado a 0-based
                if (checkboxes[i]) {
                    checkboxes[i].checked = true;
                }
            }
        } else {
            // Si este checkbox fue desmarcado, desmarca todos los checkboxes desde este en adelante
            for (let i = clickedIdx; i < checkboxes.length; i++) { // Cambiado a 0-based
                if (checkboxes[i]) {
                    checkboxes[i].checked = false;
                }
            }
        }

        // Calcular el nuevo conteo después de la manipulación del DOM
        let newCount = 0;
        checkboxes.each(function(index, el) {
            if (el.checked) {
                newCount++;
            }
        });
        
        // IMPORTANTE: Persistir el nuevo valor de dicePool.value en el actor inmediatamente.
        // Esto asegura que el estado se guarde y se recupere correctamente en las re-renderizaciones.
        await this.actor.update({ "system.dicePool.value": newCount });
        console.log(`_onDicePoolChange: Actor.system.dicePool.value actualizado y persistido a ${newCount}.`);

        // No es necesario establecer this.actor.system.dicePool.value = newCount; aquí, ya que actor.update lo maneja.
    }


    /**
     * Handle changes to goblin health checkboxes.
     * This function now only logs the change. Foundry's form submission handles the data update.
     * @param {Event} event The change event.
     * @private
     */
    _onGoblinHealthChange(event) {
        const checkbox = event.currentTarget;
        // La actualización de los datos del actor ahora la maneja el proceso de submit del formulario de Foundry
        // debido al atributo `name` completo del input.
        console.log(`_onGoblinHealthChange: Checkbox ${checkbox.name} changed to ${checkbox.checked}. Update handled by form submission.`);
        // No se necesita this.actor.update aquí.
    }

    /**
     * Handles the click event for the "Tirada" button.
     * @private
     * @param {Event} event The click event.
     */
    async _onRollButtonClick(event) {
        event.preventDefault(); // Evita el comportamiento predeterminado del botón (por ejemplo, recargar la página)

        console.log("Botón 'Tirada' clickeado!");

        // Contar los checkboxes de # Dados que están actualmente marcados en el DOM
        const dicePoolCheckboxes = this.element.find('.dice-pool .checkbox-group input[type="checkbox"]');
        let checkedDiceCount = 0;
        dicePoolCheckboxes.each(function() {
            if ($(this).is(':checked')) {
                checkedDiceCount++;
            }
        });
        
        // Usar la cuenta de checkboxes marcados del DOM para la tirada actual
        let dicePoolValue = checkedDiceCount; 

        // Obtener el modificador de dados actual desde el actor, asegurando un valor por defecto de 0
        let diceModifier = this.actor.system.diceModifier || 0;

        // Calcular la cantidad de dados a tirar: checkboxes marcados + 1
        const actualDiceToRoll = dicePoolValue + 1; // Se añade +1 como solicitado por el usuario

        // La cadena de tirada usa d6, lo que significa que los resultados de cada dado individual estarán entre 1 y 6.
        let rollString = `${actualDiceToRoll}d6`;

        console.log(`Pool de dados a tirar (base): ${dicePoolValue}, Dados reales a tirar: ${actualDiceToRoll}, Modificador a aplicar a cada dado: ${diceModifier}, Cadena de tirada base: ${rollString}`);

        // Crear una nueva tirada de Foundry y evaluarla asincrónicamente
        const roll = new Roll(rollString);
        await roll.evaluate(); // Eliminado el {async: true} deprecado

        // Obtener los resultados individuales de los dados sin modificar
        const rawIndividualResults = roll.dice[0].results.map(r => r.result);
        console.log("Resultados de dados individuales (sin modificar):", rawIndividualResults);

        // Aplicar el modificador a cada resultado y asegurar que el resultado final de cada dado esté entre 1 y 6.
        const displayedResults = rawIndividualResults.map(result => {
            const modifiedResult = result + diceModifier;
            // Asegurar que el resultado final esté dentro del rango de 1 a 6
            return Math.min(6, Math.max(1, modifiedResult));
        });
        console.log("Resultados de dados individuales (con modificador aplicado y ajustado):", displayedResults);

        // --- NUEVA LÓGICA PARA EL MENSAJE DE CHAT ---

        // 1. Contar éxitos y heridas
        const successes = displayedResults.filter(r => r >= 5).length;
        const wounds = displayedResults.filter(r => r <= 2).length;

        // 2. Reemplazar números con iconos de Font Awesome
        const diceIconMap = {
            1: 'one',
            2: 'two',
            3: 'three',
            4: 'four',
            5: 'five',
            6: 'six'
        };

        const diceIconsHtml = displayedResults.map(result => {
            const icon = diceIconMap[result] || 'question';
            return `<i class="fas fa-dice-${icon} dice-icon"></i>`;
        }).join(' ');

        const resultsHtml = `<div class="dice-results-container">${diceIconsHtml}</div>`;

        // 3. Construir los mensajes de éxito y heridas
        const successesMessage = `<div class="roll-summary success">Éxitos: ${successes}</div>`;
        const woundsMessage = `<div class="roll-summary wound">Heridas: ${wounds}</div>`;

        // Formatear el modificador para mostrar +1 si es positivo
        const formattedModifier = diceModifier > 0 ? `+${diceModifier}` : diceModifier;

        // Crear el texto descriptivo para el mensaje de chat
        const flavorText = `
            <div class="goblin-roll">
                El ${this.actor.name} lanza ${actualDiceToRoll} dados [Aplicando ${formattedModifier}]
                ${resultsHtml}
                ${successesMessage}
                ${woundsMessage}
            </div>
        `;

        // Enviar el mensaje de tirada al chat de Foundry
        roll.toMessage({
            speaker: ChatMessage.implementation.getSpeaker({ actor: this.actor }),
            flavor: flavorText
        });

        // Contar el número de 3s y 4s en los resultados modificados
        let countThrees = 0;
        let countFours = 0;
        for (const result of displayedResults) {
            if (result === 3) {
                countThrees++;
            } else if (result === 4) {
                countFours++;
            }
        }

        // Determinar el modificador y la dificultad para la siguiente tirada
        let nextModifier = 0;
        let nextDifficulty = 'normal';
        if (countThrees > countFours) {
            nextModifier = -1;
            nextDifficulty = 'hard';
        } else if (countFours > countThrees) {
            nextModifier = 1;
            nextDifficulty = 'easy';
        } else {
            nextModifier = 0;
            nextDifficulty = 'normal';
        }

        // Actualizar el modificador de dados en el actor para la siguiente tirada
        await this.actor.update({ "system.diceModifier": nextModifier });
        console.log(`Modificador para la siguiente tirada: ${nextModifier}`);

        // Actualizar la dificultad en las configuraciones globales via socket
        if (game.user.isGM) {
            // Si es GM, actualizar directamente
            const settings = game.settings.get("goblin-quest-system", "globalTasks");
            const newSettings = foundry.utils.deepClone(settings);
            newSettings.difficulty = nextDifficulty;
            await game.settings.set("goblin-quest-system", "globalTasks", newSettings);
        } else {
            // Si es jugador, enviar via socket al GM
            game.socket.emit("system.goblin-quest-system", {
                type: "updateDifficulty",
                difficulty: nextDifficulty,
                user: game.user.name
            });
        }

        // Desmarcar todos los checkboxes del pool de dados después de la tirada
        // (Esto asegura que se desmarquen *solo* los checkboxes del pool de dados)
        dicePoolCheckboxes.prop('checked', false);

        // Actualizar el valor de dicePool a 0 en el actor para reflejar que los checkboxes están desmarcados
        await this.actor.update({ "system.dicePool.value": 0 });
        console.log("Todos los checkboxes del pool de dados desmarcados y dicePool.value establecido en 0.");
    }

    /**
     * Handle single view toggle between character view and tasks view
     * @param {Event} event The click event
     * @private
     */
        /**
     * Handle single view toggle between character and tasks using hidden attribute
     * @param {Event} event   The originating click event
     * @private
     */
    _onSingleViewToggle(event) {
        event.preventDefault();
        const button = event.currentTarget;
        
        // Get the sections directly by ID
        const characterSection = document.getElementById('character-section');
        const tasksSection = document.getElementById('tasks-section');
        
        if (!characterSection || !tasksSection) {
            console.warn('Could not find character or tasks sections');
            return;
        }
        
        // Toggle visibility using hidden attribute
        if (characterSection.hidden) {
            // Currently showing tasks, switch to character
            characterSection.hidden = false;
            tasksSection.hidden = true;
            button.dataset.current = 'character-view';
            button.title = 'Ver Tareas';
            button.innerHTML = '<i class="fas fa-tasks"></i>';
        } else {
            // Currently showing character, switch to tasks
            characterSection.hidden = true;
            tasksSection.hidden = false;
            button.dataset.current = 'tasks-view';
            button.title = 'Ver Personaje';
            button.innerHTML = '<i class="fas fa-user"></i>';
        }
        
        // Save current view state
        this._saveCurrentViewState();
        
        console.log(`Switched to ${button.dataset.current}`);
    }
}
