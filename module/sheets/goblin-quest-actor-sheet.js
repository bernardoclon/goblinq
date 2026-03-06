/**
 * Extends the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
// It's not necessary to import ActorSheet directly with a module path.
// ActorSheet is a global Foundry VTT class, accessible via foundry.appv1.sheets.ActorSheet.

export class GoblinQuestActorSheet extends foundry.appv1.sheets.ActorSheet {

    constructor(...args) {
        super(...args);
        
        // Current view state (to maintain it during re-renders)
        this._currentView = 'character-view';
        
        // Store hook references for cleanup
        this._hookIds = [];
        
        // Subscribe to changes in global settings for real-time updates
        this._subscribeToGlobalTasksSettings();
    }

    /**
     * Subscribe to global tasks settings changes to update the sheet in real time
     * @private
     */
    _subscribeToGlobalTasksSettings() {
        const updateSettingId = Hooks.on("updateSetting", (setting) => {
            if (setting.key === "goblin-quest-system.globalTasks") {
                // Smoothly update without flickering if in tasks view
                if (this.rendered && this.element.is(":visible")) {
                    this._smoothUpdateTasks();
                }
            }
        });
        this._hookIds.push({ hook: "updateSetting", id: updateSettingId });

        // Refresh when actors are created or deleted to update checkbox counts
        const refreshOnActorChange = (actor) => {
            if (actor.type === 'clan') {
                if (this.rendered) {
                    this._saveCurrentViewState();
                    this.render(false);
                }
            }
        };

        const createActorId = Hooks.on("createActor", refreshOnActorChange);
        const deleteActorId = Hooks.on("deleteActor", refreshOnActorChange);

        this._hookIds.push({ hook: "createActor", id: createActorId });
        this._hookIds.push({ hook: "deleteActor", id: deleteActorId });
    }

    /**
     * Update tasks directly without any re-rendering - zero flickering
     * @private
     */
    _smoothUpdateTasks() {
        const tasksSection = this.element.find('.tasks-section')[0];
        const tasksPanel = this.element.find('.readonly-tasks-panel');
        
        // If not in tasks view, use normal re-render
        if (!tasksSection || tasksSection.hidden || tasksPanel.length === 0) {
            this._saveCurrentViewState();
            this.render(false);
            return;
        }

        try {
            // Get updated data directly
            const globalTasks = game.settings.get("goblin-quest-system", "globalTasks") || {
                objective: "",
                tasks: {
                    task1: { name: "", levels: {} },
                    task2: { name: "", levels: {} },
                    task3: { name: "", levels: {} }
                }
            };
            
            // Update objective
            const objectiveTextarea = tasksPanel.find('.objective-title textarea');
            if (objectiveTextarea.length > 0 && objectiveTextarea.val() !== globalTasks.objective) {
                objectiveTextarea.val(globalTasks.objective || '');
            }
            
            // Update each task
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
    async close(options={}) {
        this._hookIds.forEach(h => Hooks.off(h.hook, h.id));
        this._hookIds = [];
        return super.close(options);
    }

    /** @override */
    static get defaultOptions() {
        // Use foundry.utils.mergeObject for future compatibility
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["goblin-quest", "sheet", "actor"],
            template: "systems/goblin-quest-system/templates/actor-sheet.html",
            width: 400, // Initial sheet width
            height: 720, // Reduced for better initial fit
            tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "details"}] // Changed to 'details' for a more generic tab
        });
    }

    /** @override */
    getData() {
        const data = super.getData();

        // Get a mutable copy of the actor's system data,
        // ensuring that if it's a new actor and `data.actor.system` is not fully populated,
        // the default schema from the actor's prototype is used.
        // Access this.actor.system directly as super.getData() should initialize it.
        let systemData = foundry.utils.deepClone(this.actor.system);

        // Get global task data for the tasks view
        const globalTasksSettings = game.settings.get("goblin-quest-system", "globalTasks");
        const globalTasks = foundry.utils.deepClone(globalTasksSettings);

        // Calculate the number of actors for the checkboxes
        const numActors = game.actors.filter(actor => actor.type === 'clan').length;

        // Process task data to calculate numCheckboxes
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

        // Ensure the complete structure for clan details, goblins, tasks, and levels exists and
        // set default values if they are missing.

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
            // Ensure the goblin's 'name' property is initialized as a string
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

        data.system = systemData; // Assign the processed data to data.system
        data.globalTasks = globalTasks; // Add global task data

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

        // Hide the download button if the image is not a drawing (data:image/png)
        html.find('.goblin-image-container').each((i, el) => {
            const img = $(el).find('img');
            const btn = $(el).find('.download-image');
            const src = img.attr('src');
            
            // Only show if it's a system-generated drawing (PNG Data URL)
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
        
        // More robust method: Use the card's index in the DOM
        // We assume cards are rendered in order (goblin1, goblin2, etc.)
        const allCards = this.element.find('.goblin-card');
        const index = allCards.index(card);
        
        if (index > -1) {
            const goblinIndex = index + 1; // 1-based index
            const fieldPath = `system.goblins.goblin${goblinIndex}.img`;
            
            // Differentiated logic: GM uses FilePicker
            if (game.user.isGM) {
                let currentImage = foundry.utils.getProperty(this.actor, fieldPath) || "icons/svg/mystery-man.svg";

                // If it's a data URL or very long, use a default valid path to avoid errors
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

            // Players: Choose between uploading or drawing
            const currentImage = foundry.utils.getProperty(this.actor, fieldPath);
            // Only allow editing if it is a system-generated drawing (PNG Data URL)
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
                    // Style buttons to match the system
                    const buttons = html.find('button');
                    // Ensure all buttons have the same height and centered content
                    buttons.css({
                        'background': 'linear-gradient(180deg, #9CCC65 0%, #4CAF50 100%)',
                        'color': 'white',
                        'border': '1px solid #388E3C',
                        'font-family': "'Metamorphous', cursive",
                        'box-shadow': '0 2px 5px rgba(0,0,0,0.3)',
                        'display': 'flex',
                        'align-items': 'center',
                        'justify-content': 'center',
                        'gap': '5px'
                    });
                    buttons.hover(
                        function() { $(this).css('background', 'linear-gradient(180deg, #4CAF50 0%, #9CCC65 100%)'); },
                        function() { $(this).css('background', 'linear-gradient(180deg, #9CCC65 0%, #4CAF50 100%)'); }
                    );
                    
                    // Apply system styles manually to avoid layout conflicts
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
        
        console.warn("Goblin Quest System | Could not determine the image field for the goblin.");
    }

    /**
     * Processes the uploaded image to resize and compress it before saving
     * @param {File} file - The image file
     * @param {string} fieldPath - The path of the field to update
     * @private
     */
    _processAndSaveImage(file, fieldPath) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const maxWidth = 300; // Sufficient size for avatar and chat
                const maxHeight = 300;
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions while maintaining aspect ratio
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
                
                // Convert to WebP with 0.8 quality (much lighter)
                const dataUrl = canvas.toDataURL('image/webp', 0.8);
                this.actor.update({ [fieldPath]: dataUrl });
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }

    /**
     * Opens a dialog with a canvas to draw the goblin over the silhouette
     * @param {string} fieldPath - The path of the field to update
     * @param {string|null} initialImage - Optional initial image for editing
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
                // Style window and main buttons to match the system
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
                
                // Style Save button
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
                
                // Ensure contrast on tool buttons (which have a light background)
                html.find('.btn-group button').css('color', '#333');

                const canvas = html.find('#goblin-canvas')[0];
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                const colorInput = html.find('#brush-color');
                const sizeInput = html.find('#brush-size');
                const btnBrush = html.find('#tool-brush');
                const btnEraser = html.find('#tool-eraser');
                const preview = html.find('#cursor-preview');
                
                // State
                let isEraser = false;
                let history = [];
                const MAX_HISTORY = 20;
                
                // Load base silhouette
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                img.src = initialImage || "systems/goblin-quest-system/assets/silueta.webp";
                
                // Helper: Update preview
                const updatePreview = () => {
                    const size = sizeInput.val();
                    const color = isEraser ? '#ffffff' : colorInput.val();
                    
                    preview.css({
                        width: `${size}px`,
                        height: `${size}px`,
                        backgroundColor: color
                    });
                };

                // UI Listeners for preview
                sizeInput.on('input', updatePreview);
                colorInput.on('input', updatePreview);

                // Helper: Save state for Undo
                const saveState = () => {
                    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
                    if (history.length > MAX_HISTORY) history.shift();
                };

                // Drawing logic
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
                        ctx.strokeStyle = "#ffffff"; // Eraser paints white
                    } else {
                        ctx.strokeStyle = colorInput.val();
                    }
                    
                    ctx.lineTo(pos.x, pos.y);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(pos.x, pos.y);
                };

                canvas.addEventListener('mousedown', (e) => { 
                    saveState(); // Save before painting
                    painting = true; 
                    ctx.beginPath();
                    const pos = getPos(e);
                    ctx.moveTo(pos.x, pos.y);
                    draw(e);
                });
                canvas.addEventListener('mouseup', () => { painting = false; ctx.beginPath(); });
                
                // Update custom cursor position
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
                
                // Tool Buttons
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

                // Undo Button
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
        const input = event.currentTarget;
        const value = parseInt(input.value, 10);
        
        // If the entered value is greater than 99, automatically set it to 99.
        if (value > 99) {
            input.value = 99;
        } else if (value < 0) {
            // If the value is less than 0, set it to 0
            input.value = 0;
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
        // The actor data update is now handled by Foundry's form submission process
        // due to the input's full `name` attribute.
        console.log(`_onGoblinHealthChange: Checkbox ${checkbox.name} changed to ${checkbox.checked}. Update handled by form submission.`);
        // No need for this.actor.update here.
    }

    /**
     * Handles the click event for the "Tirada" button.
     * @private
     * @param {Event} event The click event.
     */
    async _onRollButtonClick(event) {
        event.preventDefault(); // Prevents the button's default behavior (e.g., reloading the page)

        console.log("Botón 'Tirada' clickeado!");

        // Get the value from the dice input
        const dicePoolInput = this.element.find('.dice-pool-input');
        let dicePoolValue = 0;
        
        if (dicePoolInput.length > 0) {
            dicePoolValue = parseInt(dicePoolInput.val(), 10);
            if (isNaN(dicePoolValue) || dicePoolValue < 0) dicePoolValue = 0;
            if (dicePoolValue > 99) dicePoolValue = 99;
        } else {
            dicePoolValue = this.actor.system.dicePool.value || 0;
        }

        // Get the global difficulty modifier from settings
        const globalSettings = game.settings.get("goblin-quest-system", "globalTasks");
        let diceModifier = 0;
        
        // Convert difficulty to modifier
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

        // Calculate the number of dice to roll: input value + 1
        const actualDiceToRoll = dicePoolValue + 1;

        // The roll string uses d6, which means the results of each individual die will be between 1 and 6.
        let rollString = `${actualDiceToRoll}d6`;

        console.log(`Pool de dados a tirar (base): ${dicePoolValue}, Dados reales a tirar: ${actualDiceToRoll}, Modificador a aplicar a cada dado: ${diceModifier}, Cadena de tirada base: ${rollString}`);

        // Create a new Foundry Roll and evaluate it asynchronously
        const roll = new Roll(rollString);
        await roll.evaluate(); // Removed deprecated {async: true}

        // Get the individual raw die results
        const rawIndividualResults = roll.dice[0].results.map(r => r.result);
        console.log("Resultados de dados individuales (sin modificar):", rawIndividualResults);

        // Apply the modifier to each result without restrictions (allows -1 and 7)
        const displayedResults = rawIndividualResults.map(result => {
            const modifiedResult = result + diceModifier;
            // Do not clamp the result - allows -1, 0, 7, etc.
            return modifiedResult;
        });
        console.log("Resultados de dados individuales (con modificador aplicado y ajustado):", displayedResults);

        // --- NEW LOGIC FOR CHAT MESSAGE ---

        // 1. Determine the active goblin (the first one that is not dead)
        let activeGoblinImg = "icons/svg/mystery-man.svg";
        let activeGoblinName = this.actor.name;

        if (this.actor.system.goblins) {
            for (let i = 1; i <= 5; i++) {
                const goblin = this.actor.system.goblins[`goblin${i}`];
                if (goblin) {
                    activeGoblinImg = goblin.img || "icons/svg/mystery-man.svg";
                    activeGoblinName = goblin.name || "Goblin";

                    // If it doesn't have both health boxes checked, it's the active one
                    if (!goblin.health.hp1 || !goblin.health.hp2) {
                        break;
                    }
                }
            }
        }

        // Truncate the name to prevent it from breaking the layout (8 letters + ...)
        if (activeGoblinName.length > 8) {
            activeGoblinName = activeGoblinName.substring(0, 8) + "...";
        }

        // 2. Count successes and wounds with special rules
        let successes = 0;
        let wounds = 0;
        
        displayedResults.forEach(r => {
            if (r === 7) {
                successes += 2; // 7 counts as 2 successes
            } else if (r >= 5) {
                successes += 1; // 5-6 normal success
            }
            
            if (r === 0) {
                wounds += 2; // 0 counts as 2 wounds
            } else if (r <= 2 && r >= 1) {
                wounds += 1; // 1, 2 normal wounds
            }
        });

        // 3. Create numbers in little boxes that simulate dice
        const diceBoxesHtml = displayedResults.map(result => {
            let displayValue = result;
            let cssClass = 'dice-box';
            
            // Special colors for extraordinary results
            if (result === 7) {
                cssClass += ' dice-seven'; // Gold for double success
            } else if (result === 0) {
                cssClass += ' dice-zero'; // Red for double wound
            } else if (result >= 5) {
                cssClass += ' dice-success'; // Green for successes
            } else if (result <= 2 && result >= 1) {
                cssClass += ' dice-wound'; // Red for wounds
            }
            
            return `<div class="${cssClass}">${displayValue}</div>`;
        }).join(' ');

        const resultsHtml = `<div class="dice-results-container">${diceBoxesHtml}</div>`;

        // 4. Build the success and wound messages
        // Inline styles to ensure same size and layout
        const boxStyle = "flex: 1; display: flex; align-items: center; justify-content: center; height: 40px; margin: 0; box-sizing: border-box;";
        const successesMessage = `<div class="roll-summary success" style="${boxStyle}">Éxitos: ${successes}</div>`;
        const woundsMessage = `<div class="roll-summary wound" style="${boxStyle}">Heridas: ${wounds}</div>`;

        // Format the modifier to show +1 if positive
        const formattedModifier = diceModifier > 0 ? `+${diceModifier}` : diceModifier;

        // Create the descriptive text for the chat message
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

        // Send the roll message to the Foundry chat
        roll.toMessage({
            speaker: ChatMessage.implementation.getSpeaker({ actor: this.actor }),
            flavor: flavorText
        });

        // Count the number of 3s and 4s in the modified results
        let countThrees = 0;
        let countFours = 0;
        for (const result of displayedResults) {
            if (result === 3) {
                countThrees++;
            } else if (result === 4) {
                countFours++;
            }
        }

        // Determine the modifier and difficulty for the next roll
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

        // Update the difficulty in global settings via socket
        if (game.user.isGM) {
            // If GM, update directly
            const settings = game.settings.get("goblin-quest-system", "globalTasks");
            const newSettings = foundry.utils.deepClone(settings);
            newSettings.difficulty = nextDifficulty;
            await game.settings.set("goblin-quest-system", "globalTasks", newSettings);
        } else {
            // If player, send via socket to GM
            game.socket.emit("system.goblin-quest-system", {
                type: "updateDifficulty",
                difficulty: nextDifficulty,
                user: game.user.name
            });
        }

        // Reset the input value to 0 after the roll
        if (dicePoolInput.length > 0) {
            dicePoolInput.val(0);
        }

        // Update the dicePool value to 0 in the actor
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
