Hooks.on("ready", () => {
    // Set up an observer to detect when the pause screen appears
    const observer = new MutationObserver((mutations) => {
        const pauseScreen = document.getElementById("pause");
        if (pauseScreen) {
            const img = pauseScreen.querySelector("img");
            if (img && !img.classList.contains('customized')) {
                img.src = "systems/goblin-quest-system/assets/logo.png";
                img.classList.add('customized'); // Mark as modified
                
                // Optional: Change the text
                const caption = pauseScreen.querySelector("figcaption");
                if (caption) caption.textContent = "Juego en Pausa";
            }
        }
    });

    // Observe changes in the body
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});
