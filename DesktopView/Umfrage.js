document.addEventListener("DOMContentLoaded", () => {

    const container = document.getElementById("surveyContainer");
    const openBtn = document.getElementById("openSurveyBtn");

    if (!container || !openBtn) return;

    openBtn.addEventListener("click", () => {

        container.innerHTML = `
            <div class="popup-overlay" id="surveyOverlay">
                <div class="popup-content">
                    <button class="close-btn" id="closeSurveyBtn">&times;</button>
                    <h2>Umfrage erstellen</h2>
                    <p>Gib eine Frage ein:</p>
                    <textarea id="surveyQuestion" rows="4"></textarea>
                    <div class="controls">
                        <button class="btn" id="cancelSurveyBtn">Abbrechen</button>
                        <button class="btn primary" id="confirmSurveyBtn">Bestätigen</button>
                    </div>
                </div>
            </div>
        `;

        const overlay = document.getElementById("surveyOverlay");
        const close = () => overlay.remove();

        document.getElementById("closeSurveyBtn").onclick = close;
        document.getElementById("cancelSurveyBtn").onclick = close;

        document.getElementById("confirmSurveyBtn").onclick = () => {
            const question = document.getElementById("surveyQuestion").value.trim();
            if (!question) {
                alert("Bitte eine Frage eingeben");
                return;
            }
            console.log("Umfrage:", question);
            close();
        };

        overlay.addEventListener("click", e => {
            if (e.target === overlay) close();
        });
    });
});
