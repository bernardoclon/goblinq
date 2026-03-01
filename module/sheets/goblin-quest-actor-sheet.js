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
        const tasksSection = this.element.find('.tasks-section')[0];
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
            const characterSection = this.element.find('.character-section')[0];
            const tasksSection = this.element.find('.tasks-section')[0];
            
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
            height: 720, // Reducido para mejor adaptación inicial
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
            systemData.dicePool = { value: 0 };
        }
        // Ensure dicePool.value is a number and within bounds
        if (typeof systemData.dicePool.value !== 'number' || systemData.dicePool.value < 0) {
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

        // Listener for the dice pool input to enforce max value
        html.find('.dice-pool-input').on('input change', this._onDicePoolValueChange.bind(this));

        html.find('.goblin-health .checkbox-group input[type="checkbox"]').change(this._onGoblinHealthChange.bind(this));

        // Roll button listener
        html.find('.roll-button').click(this._onRollButtonClick.bind(this));

        // Single view toggle listener
        html.find('.single-view-toggle').click(this._onSingleViewToggle.bind(this));

        // Listener for goblin images to open FilePicker
        const goblinImages = html.find('.goblin-image-container img');
        goblinImages.css('cursor', 'pointer');
        goblinImages.click(this._onGoblinImageClick.bind(this));

        // Listener for download image button
        html.find('.download-image').click(this._onDownloadImage.bind(this));

        // Ocultar el botón de descarga si la imagen no es un dibujo (data:image/png)
        html.find('.goblin-image-container').each((i, el) => {
            const img = $(el).find('img');
            const btn = $(el).find('.download-image');
            const src = img.attr('src');
            
            // Solo mostrar si es un dibujo generado por el sistema (PNG Data URL)
            if (!src || !src.startsWith('data:image/png')) {
                btn.hide();
            }
        });
    }

    /**
     * Handle click on goblin image to open file picker
     * @param {Event} event 
     * @private
     */
    _onDownloadImage(event) {
        event.preventDefault();
        event.stopPropagation();

        const button = event.currentTarget;
        const imgElement = $(button).siblings('img')[0];
        
        if (!imgElement || !imgElement.src) return;

        const src = imgElement.src;
        const goblinName = imgElement.title || "Goblin";
        
        // Create a canvas to resize/format the image
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1920;
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        img.crossOrigin = "Anonymous";
        
        img.onload = () => {
            // Calculate dimensions to simulate object-fit: cover
            const sWidth = img.width;
            const sHeight = img.height;
            const dWidth = 1920;
            const dHeight = 1920;
            
            const scale = Math.max(dWidth / sWidth, dHeight / sHeight);
            
            const renderWidth = sWidth * scale;
            const renderHeight = sHeight * scale;
            const offsetX = (dWidth - renderWidth) / 2;
            const offsetY = (dHeight - renderHeight) / 2;
            
            ctx.drawImage(img, offsetX, offsetY, renderWidth, renderHeight);
            
            // Create download link
            const link = document.createElement('a');
            link.download = `${goblinName.replace(/\s+/g, '_')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };
        
        img.onerror = () => {
            ui.notifications.error("Error al procesar la imagen para descarga.");
        };
        
        img.src = src;
    }

    _onGoblinImageClick(event) {
        event.preventDefault();
        const img = event.currentTarget;
        const card = $(img).closest('.goblin-card');
        
        // Método más robusto: Usar el índice de la tarjeta en el DOM
        // Asumimos que las tarjetas se renderizan en orden (goblin1, goblin2, etc.)
        const allCards = this.element.find('.goblin-card');
        const index = allCards.index(card);
        
        if (index > -1) {
            const goblinIndex = index + 1; // 1-based index
            const fieldPath = `system.goblins.goblin${goblinIndex}.img`;
            
            // Lógica diferenciada: GM usa FilePicker
            if (game.user.isGM) {
                let currentImage = foundry.utils.getProperty(this.actor, fieldPath) || "icons/svg/mystery-man.svg";

                // Si es data URL o muy larga, usar ruta válida por defecto para evitar errores
                if (currentImage.includes("data:") || currentImage.length > 256) {
                    currentImage = "icons/svg/mystery-man.svg";
                }

                const fp = new FilePicker({
                    type: "image",
                    current: currentImage,
                    callback: path => {
                        this.actor.update({ [fieldPath]: path });
                    },
                    top: this.position.top + 40,
                    left: this.position.left + 10
                });
                return fp.render(true);
            }

            // Jugadores: Elegir entre subir o dibujar
            const currentImage = foundry.utils.getProperty(this.actor, fieldPath);
            // Solo permitir editar si es un dibujo generado por el sistema (PNG Data URL)
            const isDrawing = currentImage && currentImage.startsWith("data:image/png");

            const buttons = {
                upload: {
                    label: "Subir Imagen",
                    icon: '<i class="fas fa-upload"></i>',
                    callback: () => {
                        const fileInput = document.createElement('input');
                        fileInput.type = 'file';
                        fileInput.accept = 'image/*';
                        fileInput.onchange = event => {
                            const file = event.target.files[0];
                            if (file) {
                                this._processAndSaveImage(file, fieldPath);
                            }
                        };
                        fileInput.click();
                    }
                },
                draw: {
                    label: "Dibujar",
                    icon: '<i class="fas fa-paint-brush"></i>',
                    callback: () => this._openDrawingDialog(fieldPath)
                }
            };

            if (isDrawing) {
                buttons.edit = {
                    label: "Editar",
                    icon: '<i class="fas fa-edit"></i>',
                    callback: () => this._openDrawingDialog(fieldPath, currentImage)
                };
            }

            new Dialog({
                title: "Personalizar Goblin",
                content: "<p style='text-align: center; margin-bottom: 10px;'>¿Cómo quieres representar a este goblin?</p>",
                buttons: buttons,
                default: "draw",
                render: (html) => {
                    // Estilizar botones para que coincidan con el sistema
                    const buttons = html.find('button');
                    buttons.css({
                        'background': 'linear-gradient(180deg, #9CCC65 0%, #4CAF50 100%)',
                        'color': 'white',
                        'border': '1px solid #388E3C',
                        'font-family': "'Metamorphous', cursive",
                        'box-shadow': '0 2px 5px rgba(0,0,0,0.3)'
                    });
                    buttons.hover(
                        function() { $(this).css('background', 'linear-gradient(180deg, #4CAF50 0%, #9CCC65 100%)'); },
                        function() { $(this).css('background', 'linear-gradient(180deg, #9CCC65 0%, #4CAF50 100%)'); }
                    );
                    
                    // Aplicar estilos del sistema manualmente para evitar conflictos de layout
                    const dialog = html.closest('.window-app');
                    dialog.css({
                        'background': 'linear-gradient(135deg, #286C2D 0%, #1A4D1F 100%)',
                        'border': '2px solid #3AA044',
                        'border-radius': '8px',
                        'font-family': "'Metamorphous', cursive",
                        'color': '#E0E0E0'
                    });
                    dialog.find('.window-header').css({
                        'color': '#E0E0E0',
                        'border-bottom': '1px solid #3AA044'
                    });
                    dialog.find('.window-content').css({
                        'background': 'transparent',
                        'color': '#E0E0E0'
                    });
                }
            }, {
                classes: ["dialog"],
                width: 400
            }).render(true);
            
            return;
        }
        
        console.warn("Goblin Quest System | No se pudo determinar el campo de imagen para el goblin.");
    }

    /**
     * Procesa la imagen subida para redimensionarla y comprimirla antes de guardar
     * @param {File} file - El archivo de imagen
     * @param {string} fieldPath - La ruta del campo a actualizar
     * @private
     */
    _processAndSaveImage(file, fieldPath) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const maxWidth = 300; // Tamaño suficiente para avatar y chat
                const maxHeight = 300;
                let width = img.width;
                let height = img.height;

                // Calcular nuevas dimensiones manteniendo aspecto
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convertir a WebP con calidad 0.8 (mucho más ligero)
                const dataUrl = canvas.toDataURL('image/webp', 0.8);
                this.actor.update({ [fieldPath]: dataUrl });
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }

    /**
     * Abre un diálogo con canvas para dibujar el goblin sobre la silueta
     * @param {string} fieldPath - El path del campo a actualizar
     * @param {string|null} initialImage - Imagen inicial opcional para editar
     * @private
     */
    _openDrawingDialog(fieldPath, initialImage = null) {
        const content = `
            <div class="goblin-drawing-tool">
                <div style="margin-bottom: 10px; display: flex; gap: 5px; align-items: center; justify-content: center; flex-wrap: wrap;">
                    <label title="Color" style="display: flex; align-items: center;">
                        <input type="color" id="brush-color" value="#000000" style="height: 30px; width: 30px; cursor: pointer; border: none; padding: 0;">
                    </label>
                    <label title="Tamaño" style="display: flex; align-items: center; font-size: 0.8em;">
                        <input type="range" id="brush-size" min="1" max="30" value="5" style="width: 60px;">
                    </label>
                    <div class="btn-group" style="display: flex; gap: 2px; margin-left: 5px;">
                        <button type="button" id="tool-brush" title="Pincel" style="width: 30px; height: 30px; padding: 0; background: #ddd;"><i class="fas fa-paint-brush"></i></button>
                        <button type="button" id="tool-eraser" title="Borrador" style="width: 30px; height: 30px; padding: 0;"><i class="fas fa-eraser"></i></button>
                        <button type="button" id="action-undo" title="Deshacer" style="width: 30px; height: 30px; padding: 0;"><i class="fas fa-undo"></i></button>
                        <button type="button" id="clear-canvas" title="Reiniciar" style="width: 30px; height: 30px; padding: 0;"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div style="text-align: center; border: 2px solid #000; display: inline-block; background: #fff; position: relative; cursor: none;">
                    <canvas id="goblin-canvas" width="350" height="350" style="display: block;"></canvas>
                    <div id="cursor-preview" style="pointer-events: none; position: absolute; border-radius: 50%; transform: translate(-50%, -50%); display: none; border: 1px solid #888;"></div>
                </div>
            </div>`;

        new Dialog({
            title: "Taller de Arte Goblin",
            content: content,
            buttons: {
                save: {
                    label: "Guardar Obra Maestra",
                    icon: '<i class="fas fa-save"></i>',
                    callback: (html) => {
                        const canvas = html.find('#goblin-canvas')[0];
                        this.actor.update({ [fieldPath]: canvas.toDataURL("image/png") });
                    }
                }
            },
            render: (html) => {
                // Estilizar ventana y botones principales para coincidir con el sistema
                const dialog = html.closest('.window-app');
                dialog.css({
                    'background': 'linear-gradient(135deg, #286C2D 0%, #1A4D1F 100%)',
                    'border': '2px solid #3AA044',
                    'border-radius': '8px',
                    'font-family': "'Metamorphous', cursive",
                    'color': '#E0E0E0'
                });
                dialog.find('.window-header').css({
                    'color': '#E0E0E0',
                    'border-bottom': '1px solid #3AA044'
                });
                dialog.find('.window-content').css({
                    'background': 'transparent',
                    'color': '#E0E0E0'
                });
                
                // Estilizar botón de Guardar
                const saveButton = dialog.find('.dialog-button');
                saveButton.css({
                    'background': 'linear-gradient(180deg, #9CCC65 0%, #4CAF50 100%)',
                    'color': 'white',
                    'border': '1px solid #388E3C',
                    'font-family': "'Metamorphous', cursive",
                    'box-shadow': '0 2px 5px rgba(0,0,0,0.3)'
                });
                saveButton.hover(
                    function() { $(this).css('background', 'linear-gradient(180deg, #4CAF50 0%, #9CCC65 100%)'); },
                    function() { $(this).css('background', 'linear-gradient(180deg, #9CCC65 0%, #4CAF50 100%)'); }
                );
                
                // Asegurar contraste en botones de herramientas (que tienen fondo claro)
                html.find('.btn-group button').css('color', '#333');

                const canvas = html.find('#goblin-canvas')[0];
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                const colorInput = html.find('#brush-color');
                const sizeInput = html.find('#brush-size');
                const btnBrush = html.find('#tool-brush');
                const btnEraser = html.find('#tool-eraser');
                const preview = html.find('#cursor-preview');
                
                // Estado
                let isEraser = false;
                let history = [];
                const MAX_HISTORY = 20;
                
                // Cargar silueta base
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                img.src = initialImage || "systems/goblin-quest-system/assets/silueta.webp";
                
                // Helper: Actualizar previsualización
                const updatePreview = () => {
                    const size = sizeInput.val();
                    const color = isEraser ? '#ffffff' : colorInput.val();
                    
                    preview.css({
                        width: `${size}px`,
                        height: `${size}px`,
                        backgroundColor: color
                    });
                };

                // Listeners de UI para previsualización
                sizeInput.on('input', updatePreview);
                colorInput.on('input', updatePreview);

                // Helper: Guardar estado para Deshacer
                const saveState = () => {
                    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
                    if (history.length > MAX_HISTORY) history.shift();
                };

                // Lógica de dibujo
                let painting = false;
                const getPos = (e) => {
                    const rect = canvas.getBoundingClientRect();
                    return {
                        x: (e.clientX - rect.left) * (canvas.width / rect.width),
                        y: (e.clientY - rect.top) * (canvas.height / rect.height)
                    };
                };

                const draw = (e) => {
                    if (!painting) return;
                    const pos = getPos(e);
                    ctx.lineWidth = sizeInput.val();
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    
                    if (isEraser) {
                        ctx.strokeStyle = "#ffffff"; // Borrador pinta blanco
                    } else {
                        ctx.strokeStyle = colorInput.val();
                    }
                    
                    ctx.lineTo(pos.x, pos.y);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(pos.x, pos.y);
                };

                canvas.addEventListener('mousedown', (e) => { 
                    saveState(); // Guardar antes de pintar
                    painting = true; 
                    ctx.beginPath();
                    const pos = getPos(e);
                    ctx.moveTo(pos.x, pos.y);
                    draw(e);
                });
                canvas.addEventListener('mouseup', () => { painting = false; ctx.beginPath(); });
                
                // Actualizar posición del cursor personalizado
                canvas.addEventListener('mousemove', (e) => {
                    const rect = canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    preview.css({ left: x + 'px', top: y + 'px', display: 'block' });
                    draw(e);
                });

                canvas.addEventListener('mouseleave', () => { 
                    painting = false; 
                    ctx.beginPath(); 
                    preview.css('display', 'none');
                });
                
                // Botones de Herramientas
                btnBrush.click(() => {
                    isEraser = false;
                    btnBrush.css('background', '#ddd');
                    btnEraser.css('background', '');
                    updatePreview();
                });

                btnEraser.click(() => {
                    isEraser = true;
                    btnEraser.css('background', '#ddd');
                    btnBrush.css('background', '');
                    updatePreview();
                });

                // Botón Deshacer
                html.find('#action-undo').click(() => {
                    if (history.length > 0) {
                        ctx.putImageData(history.pop(), 0, 0);
                    }
                });

                html.find('#clear-canvas').click(() => {
                    saveState();
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                });
            }
        }, { width: 390, height: "auto" }).render(true);
    }

    /**
     * Handle changes to the dice pool input to enforce a max value.
     * This only updates the DOM value and does not trigger an actor update,
     * which prevents re-rendering issues that could interfere with button clicks.
     * @param {Event} event The input or change event.
     * @private
     */
    _onDicePoolValueChange(event) {
        event.preventDefault();
        const input = event.currentTarget;
        
        // If the entered value is greater than 99, automatically set it to 99.
        if (parseInt(input.value, 10) > 99) {
            input.value = 99;
        }
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

        // Obtener el valor del input de dados
        const dicePoolInput = this.element.find('.dice-pool-input');
        let dicePoolValue = 0;
        
        if (dicePoolInput.length > 0) {
            dicePoolValue = parseInt(dicePoolInput.val());
            if (isNaN(dicePoolValue) || dicePoolValue < 0) dicePoolValue = 0;
            if (dicePoolValue > 99) dicePoolValue = 99;
        } else {
            dicePoolValue = this.actor.system.dicePool.value || 0;
        }

        // Obtener el modificador de la dificultad global desde las configuraciones
        const globalSettings = game.settings.get("goblin-quest-system", "globalTasks");
        let diceModifier = 0;
        
        // Convertir dificultad a modificador
        switch (globalSettings.difficulty) {
            case "easy":
                diceModifier = 1;
                break;
            case "normal":
                diceModifier = 0;
                break;
            case "hard":
                diceModifier = -1;
                break;
            default:
                diceModifier = 0;
        }
        
        console.log(`Dificultad global: ${globalSettings.difficulty}, Modificador aplicado: ${diceModifier}`);

        // Calcular la cantidad de dados a tirar: valor del input + 1
        const actualDiceToRoll = dicePoolValue + 1;

        // La cadena de tirada usa d6, lo que significa que los resultados de cada dado individual estarán entre 1 y 6.
        let rollString = `${actualDiceToRoll}d6`;

        console.log(`Pool de dados a tirar (base): ${dicePoolValue}, Dados reales a tirar: ${actualDiceToRoll}, Modificador a aplicar a cada dado: ${diceModifier}, Cadena de tirada base: ${rollString}`);

        // Crear una nueva tirada de Foundry y evaluarla asincrónicamente
        const roll = new Roll(rollString);
        await roll.evaluate(); // Eliminado el {async: true} deprecado

        // Obtener los resultados individuales de los dados sin modificar
        const rawIndividualResults = roll.dice[0].results.map(r => r.result);
        console.log("Resultados de dados individuales (sin modificar):", rawIndividualResults);

        // Aplicar el modificador a cada resultado sin restricciones (permite -1 y 7)
        const displayedResults = rawIndividualResults.map(result => {
            const modifiedResult = result + diceModifier;
            // No restringir el resultado - permite -1, 0, 7, etc.
            return modifiedResult;
        });
        console.log("Resultados de dados individuales (con modificador aplicado y ajustado):", displayedResults);

        // --- NUEVA LÓGICA PARA EL MENSAJE DE CHAT ---

        // 1. Determinar el goblin activo (el primero que no esté muerto)
        let activeGoblinImg = "icons/svg/mystery-man.svg";
        let activeGoblinName = this.actor.name;

        if (this.actor.system.goblins) {
            for (let i = 1; i <= 5; i++) {
                const goblin = this.actor.system.goblins[`goblin${i}`];
                if (goblin) {
                    activeGoblinImg = goblin.img || "icons/svg/mystery-man.svg";
                    activeGoblinName = goblin.name || "Goblin";

                    // Si no tiene ambas casillas de salud marcadas, es el activo
                    if (!goblin.health.hp1 || !goblin.health.hp2) {
                        break;
                    }
                }
            }
        }

        // Truncar el nombre para evitar que rompa el diseño (8 letras + ...)
        if (activeGoblinName.length > 8) {
            activeGoblinName = activeGoblinName.substring(0, 8) + "...";
        }

        // 2. Contar éxitos y heridas con reglas especiales
        let successes = 0;
        let wounds = 0;
        
        displayedResults.forEach(r => {
            if (r === 7) {
                successes += 2; // 7 cuenta como 2 éxitos
            } else if (r >= 5) {
                successes += 1; // 5-6 normal success
            }
            
            if (r === 0) {
                wounds += 2; // 0 cuenta como 2 heridas
            } else if (r <= 2 && r >= 1) {
                wounds += 1; // 1, 2 normal wounds
            }
        });

        // 3. Crear números en cajitas que simulan dados
        const diceBoxesHtml = displayedResults.map(result => {
            let displayValue = result;
            let cssClass = 'dice-box';
            
            // Colores especiales para resultados extraordinarios
            if (result === 7) {
                cssClass += ' dice-seven'; // Dorado para éxito doble
            } else if (result === 0) {
                cssClass += ' dice-zero'; // Rojo para herida doble
            } else if (result >= 5) {
                cssClass += ' dice-success'; // Verde para éxitos
            } else if (result <= 2 && result >= 1) {
                cssClass += ' dice-wound'; // Rojo para heridas
            }
            
            return `<div class="${cssClass}">${displayValue}</div>`;
        }).join(' ');

        const resultsHtml = `<div class="dice-results-container">${diceBoxesHtml}</div>`;

        // 4. Construir los mensajes de éxito y heridas
        // Estilos inline para asegurar mismo tamaño y disposición
        const boxStyle = "flex: 1; display: flex; align-items: center; justify-content: center; height: 40px; margin: 0; box-sizing: border-box;";
        const successesMessage = `<div class="roll-summary success" style="${boxStyle}">Éxitos: ${successes}</div>`;
        const woundsMessage = `<div class="roll-summary wound" style="${boxStyle}">Heridas: ${wounds}</div>`;

        // Formatear el modificador para mostrar +1 si es positivo
        const formattedModifier = diceModifier > 0 ? `+${diceModifier}` : diceModifier;

        // Crear el texto descriptivo para el mensaje de chat
        const flavorText = `
            <div class="goblin-roll" style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
                <img src="${activeGoblinImg}" style="width: 80px; height: 80px; border-radius: 50%; border: 2px solid #333; object-fit: cover; box-shadow: 0 2px 5px rgba(0,0,0,0.3); margin-bottom: 5px;" title="Goblin Activo" />
                <div style="text-align: center; margin-bottom: 5px;">
                    ${activeGoblinName} lanza ${actualDiceToRoll} dados [Aplicando ${formattedModifier}]
                </div>
                ${resultsHtml}
                <div style="display: flex; width: 100%; gap: 10px; justify-content: space-between; margin-top: 5px;">
                    ${successesMessage}
                    ${woundsMessage}
                </div>
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

        console.log(`Dificultad para la siguiente tirada: ${nextDifficulty} (${nextModifier})`);

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

        // Resetear el valor del input a 0 después de la tirada
        if (dicePoolInput.length > 0) {
            dicePoolInput.val(0);
        }

        // Actualizar el valor de dicePool a 0 en el actor
        await this.actor.update({ "system.dicePool.value": 0 });
        console.log("Input de dados reseteado y dicePool.value establecido en 0.");
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
        
        // Get the sections within this specific sheet
        const characterSection = this.element.find('.character-section')[0];
        const tasksSection = this.element.find('.tasks-section')[0];
        
        if (!characterSection || !tasksSection) {
            console.warn('Could not find character or tasks sections in this sheet');
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
