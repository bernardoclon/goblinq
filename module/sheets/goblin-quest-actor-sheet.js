/**
 * Extends the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
// No es necesario importar ActorSheet directamente con una ruta de módulo.
// ActorSheet es una clase global de Foundry VTT, accesible a través de foundry.appv1.sheets.ActorSheet.

export class GoblinQuestActorSheet extends foundry.appv1.sheets.ActorSheet {

    /** @override */
    static get defaultOptions() {
        // Usar foundry.utils.mergeObject para compatibilidad futura
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["goblin-quest", "sheet", "actor"],
            template: "systems/goblin-quest-system/templates/actor-sheet.html",
            width: 615, // Ancho inicial de la hoja
            minWidth: 615, // Ancho mínimo que la hoja puede tener al redimensionar
            height: 710, // Reducido para mejor adaptación inicial
            tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "details"}] // Cambiado a 'details' para una pestaña más genérica
        });
    }

    /**
     * Almacena el estado actual de los paneles antes de la re-renderización.
     * @override
     */
    _render(force = false, options = {}) {
        // Almacenar el estado actual de los paneles
        this.panelState = {
            rightPanelVisible: this.element.find('.right-panel:visible').length > 0
        };

        // Continuar con el método de renderización original de Foundry
        return super._render(force, options);
    }

    /**
     * Sobrescribe el método _renderInner para restaurar el estado de los paneles después de la re-renderización.
     * @override
     */
    async _renderInner(data) {
        // Primero, llamar al método original para obtener el HTML renderizado
        const html = await super._renderInner(data);
        
        // Restaurar el estado de los paneles
        this._restorePanelVisibility(html);
        
        // Devolver el HTML modificado
        return html;
    }

    /**
     * Restaura la visibilidad de los paneles en el HTML renderizado.
     * @param {jQuery} html El objeto jQuery del HTML de la hoja.
     * @private
     */
    _restorePanelVisibility(html) {
        const panelLeft = html.find('.left-panel');
        const panelRight = html.find('.right-panel');

        // Si el panel derecho estaba visible antes de la renderización, asegúrate de que siga visible
        if (this.panelState && this.panelState.rightPanelVisible) {
            panelLeft.attr('hidden', true);
            panelRight.attr('hidden', null);
        } else {
            // De lo contrario, asegura que el panel izquierdo esté visible (comportamiento por defecto)
            panelLeft.attr('hidden', null);
            panelRight.attr('hidden', true);
        }
    }


    /** @override */
    getData() {
        const data = super.getData();

        // Obtener una copia mutable de los datos del sistema del actor,
        // asegurándose de que si es un actor nuevo y `data.actor.system` no está completamente poblado,
        // se use el esquema por defecto del prototipo del actor.
        // Acceder a this.actor.system directamente ya que super.getData() debería inicializarlo.
        let systemData = foundry.utils.deepClone(this.actor.system);

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


        // Initialize tasks and their levels if not present or incomplete
        if (!systemData.tasks) {
            systemData.tasks = {};
        }
        for (let i = 1; i <= 3; i++) { // tasks 1, 2, 3
            const taskKey = `task${i}`;
            if (!systemData.tasks[taskKey]) {
                systemData.tasks[taskKey] = { name: "", levels: {} };
            }
            // Asegurarse de que la propiedad 'name' de la tarea esté inicializada como una cadena
            if (typeof systemData.tasks[taskKey].name !== 'string') {
                systemData.tasks[taskKey].name = "";
            }
            // Asegurarse de que el objeto 'levels' exista dentro de la tarea
            if (!systemData.tasks[taskKey].levels) {
                systemData.tasks[taskKey].levels = {};
            }

            for (let j = 1; j <= 3; j++) { // levels 1, 2, 3
                const levelKey = `level${j}`;
                // Asegurarse de que el objeto 'level' exista con valores predeterminados
                if (!systemData.tasks[taskKey].levels[levelKey]) {
                    systemData.tasks[taskKey].levels[levelKey] = {
                        challenge: 3,
                        checkboxStates: [false, false, false, false]
                    };
                } else {
                    // Asegurar que 'challenge' sea un número y esté dentro del rango (3 o 4)
                    if (typeof systemData.tasks[taskKey].levels[levelKey].challenge !== 'number' ||
                        (systemData.tasks[taskKey].levels[levelKey].challenge !== 3 && systemData.tasks[taskKey].levels[levelKey].challenge !== 4)) {
                        systemData.tasks[taskKey].levels[levelKey].challenge = 3; // Restablecer a valor predeterminado si es inválido
                    }
                    // Asegurar que 'checkboxStates' sea un array de 4 booleanos
                    if (!Array.isArray(systemData.tasks[taskKey].levels[levelKey].checkboxStates) ||
                        systemData.tasks[taskKey].levels[levelKey].checkboxStates.length !== 4 ||
                        systemData.tasks[taskKey].levels[levelKey].checkboxStates.some(state => typeof state !== 'boolean')) {
                        systemData.tasks[taskKey].levels[levelKey].checkboxStates = [false, false, false, false];
                    }
                }
            }
        }
        // Asegurarse de que systemData.objective sea una cadena
        if (typeof systemData.objective !== 'string') {
            systemData.objective = "";
        }


        data.system = systemData; // Asignamos los datos procesados a data.system

        console.log("getData() | Final processed data.system:", foundry.utils.deepClone(data.system));
        return data;
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;

        // Listener for the dice pool checkboxes
        html.find('.dice-pool .checkbox-group input[type="checkbox"]').change(this._onDicePoolChange.bind(this));

        // Listener for goblin health checkboxes - SIMPLIFICADO
        // Foundry VTT maneja la actualización directamente con el atributo 'name' del input
        html.find('.goblin-health .checkbox-group input[type="checkbox"]').change(this._onGoblinHealthChange.bind(this));

        // Listener for task challenge select changes
        html.find('.task-level .challenge-group select').change(this._onChallengeChange.bind(this));

        // Listener for task checkboxes (levels) - SIMPLIFICADO
        // Foundry VTT maneja la actualización directamente con el atributo 'name' del input
        html.find('.task-checkboxes input[type="checkbox"]').change(this._onTaskCheckboxChange.bind(this));

        // Initial visibility check for challenge-based checkboxes
        this._updateAllChallengeCheckboxVisibility(html);

        // Roll button listener
        html.find('.roll-button').click(this._onRollButtonClick.bind(this));
        
        // Nuevo listener para alternar paneles con el botón .collapse-button
        html.find('.collapse-button').click(ev => {
            this._togglePanelsVisibility(html);
        });
    }

    /**
     * Override Foundry's internal _onResize method to react to sheet resizing.
     * @override
     * @param {number} width - The new width of the application window.
     * @param {number} height - The new height of the application window.
     */
    _onResize(width, height) {
        super._onResize(width, height); // Call the parent's _onResize
        // NOTA: La lógica de layout para las tareas ahora se gestiona completamente con CSS.
        // Se ha eliminado la llamada a _updateTaskSectionLayout() aquí.
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
     * Handle changes to task challenge select.
     * This function now only updates visibility. Foundry's form submission handles the data update.
     * @param {Event} event The change event.
     * @private
     */
    async _onChallengeChange(event) {
        const select = event.currentTarget;
        const challengeValue = parseInt(select.value, 10);
        const challengeInputName = select.name; // e.g., "system.tasks.task1.levels.level1.challenge"

        // Split the name to get the path to the property
        // Example: "system.tasks.task1.levels.level1.challenge" -> ["system", "tasks", "task1", "levels", "level1", "challenge"]
        const pathParts = challengeInputName.split('.');
        let currentData = this.actor.system; // Start from systemData

        // Traverse the path to the parent object of the challenge field
        for (let i = 0; i < pathParts.length - 1; i++) {
            if (currentData[pathParts[i]] === undefined) {
                // If any part of the path is undefined, initialize it (should be handled by getData, but as a safeguard)
                currentData[pathParts[i]] = {};
            }
            currentData = currentData[pathParts[i]];
        }
        // Explicitly update the in-memory data for the challenge field
        currentData[pathParts[pathParts.length - 1]] = challengeValue;
        console.log(`_onChallengeChange: Actor.system.${challengeInputName} updated to ${challengeValue} (in memory).`);


        // NO se llama a this.actor.update aquí. Foundry lo manejará en el submit del formulario.
        console.log(`_onChallengeChange: Select ${challengeInputName} changed to ${challengeValue}. Update handled by form submission.`);
        
        // Simplemente actualiza la visibilidad del 4º checkbox en el DOM.
        const groupElement = $(select).closest('.task-level').find('.task-checkboxes')[0];
        if (groupElement) {
            this._updateChallengeCheckboxVisibility(groupElement, challengeInputName, challengeValue);
        }
    }


    /**
     * Handle changes to task checkboxes (for levels).
     * This function now only logs the change. Foundry's form submission handles the data update.
     * @param {Event} event The change event.
     * @private
     */
    _onTaskCheckboxChange(event) {
        const checkbox = event.currentTarget;
    }

    /**
     * Updates the visibility of the 4th checkbox for all challenge groups on sheet render.
     * @param {HTMLElement} html The HTML element of the sheet.
     * @private
     */
    _updateAllChallengeCheckboxVisibility(html) {
        // Iterate over each challenge select and trigger the visibility update
        html.find('.task-level .challenge-group select').each((index, selectElement) => {
            const challengeSelect = $(selectElement);
            const challengeInputName = challengeSelect.attr('name');
            const challengeValue = parseInt(challengeSelect.val(), 10);
            const groupElement = challengeSelect.closest('.task-level').find('.task-checkboxes')[0];
            if (groupElement) {
                this._updateChallengeCheckboxVisibility(groupElement, challengeInputName, challengeValue);
            }
        });
    }

    /**
     * Updates the visibility of a single 4th task checkbox based on its challenge value.
     * This function is called by _updateAllChallengeCheckboxVisibility and _onChallengeChange.
     * @param {HTMLElement} groupElement The .checkbox-group HTML element for the task.
     * @param {string} challengeInputName The name attribute of the challenge select input.
     * @param {number} challengeValue The current challenge value (3 or 4).
     * @private
     */
    _updateChallengeCheckboxVisibility(groupElement, challengeInputName, challengeValue) {
        const fourthCheckbox = $(groupElement).find('input[data-idx="3"]'); // El 4º checkbox (índice 3)

        if (fourthCheckbox.length > 0) {
            // Solo alterna la clase CSS, no llama a render ni actualiza datos.
            if (challengeValue === 4) {
                fourthCheckbox.removeClass('hidden-checkbox');
            } else { // challengeValue es 3
                fourthCheckbox.addClass('hidden-checkbox');
            }
        }
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

        // Formatear los resultados para mostrarlos en HTML, envueltos en un nuevo div
        const resultsHtml = `<div class="dice-results-container">${displayedResults.map(result => `<span class="dice-result">${result}</span>`).join(' ')}</div>`;
        
        // Formatear el modificador para mostrar +1 si es positivo
        const formattedModifier = diceModifier > 0 ? `+${diceModifier}` : diceModifier;

        // Crear el texto descriptivo para el mensaje de chat
        const flavorText = `Tirada de desafío para ${this.actor.name} (Dados base: ${actualDiceToRoll}d6, Modificador aplicado a cada dado: ${formattedModifier}):<br>${resultsHtml}`;

        // Enviar el mensaje de tirada al chat de Foundry
        // En v13, ChatMessage.getSpeaker se mueve a ChatMessage.implementation.getSpeaker
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

        // Determinar el modificador para la siguiente tirada
        let nextModifier = 0;
        if (countThrees > countFours) {
            nextModifier = -1;
        } else if (countFours > countThrees) {
            nextModifier = 1;
        } else {
            nextModifier = 0;
        }

        // Actualizar el modificador de dados en el actor para la siguiente tirada
        await this.actor.update({ "system.diceModifier": nextModifier });
        console.log(`Modificador para la siguiente tirada: ${nextModifier}`);

        // Desmarcar todos los checkboxes del pool de dados después de la tirada
        // (Esto asegura que se desmarquen *solo* los checkboxes del pool de dados)
        dicePoolCheckboxes.prop('checked', false);

        // Actualizar el valor de dicePool a 0 en el actor para reflejar que los checkboxes están desmarcados
        await this.actor.update({ "system.dicePool.value": 0 });
        console.log("Todos los checkboxes del pool de dados desmarcados y dicePool.value establecido en 0.");
    }
    /**
     * Alterna la visibilidad entre los paneles izquierdo y derecho al hacer clic en un botón.
     * Se asume que hay un botón con la clase .collapse-button y paneles con clases .panel-left y .panel-right.
     */
    _togglePanelsVisibility(html) {
        const panelLeft = html.find('.left-panel');
        const panelRight = html.find('.right-panel');
        // Alternar el atributo hidden
        const leftHidden = panelLeft.attr('hidden') !== undefined;
        panelLeft.attr('hidden', leftHidden ? null : true);
        panelRight.attr('hidden', leftHidden ? true : null);
    }
}
