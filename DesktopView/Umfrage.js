document.addEventListener("DOMContentLoaded", () => {

    const STORAGE_KEY = "savedSurveys";

    const container = document.getElementById("surveyContainer");
    const openBtn = document.getElementById("openSurveyBtn");

    if (!container || !openBtn) return;

    loadSavedSurveys();

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

            saveSurvey(question);
            addSurveyPoll(question);
            close();
        };

        overlay.addEventListener("click", e => {
            if (e.target === overlay) close();
        });
    });

    function saveSurvey(question) {
        const surveys = getSavedSurveys();
        surveys.push(question);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(surveys));
    }

    function getSavedSurveys() {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    }

    function removeSurvey(question) {
        let surveys = getSavedSurveys();
        surveys = surveys.filter(q => q !== question);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(surveys));
    }

    function loadSavedSurveys() {
    const surveys = getSavedSurveys();

    const target =
        document.querySelectorAll(".section")[1]
        .querySelectorAll(".block")[1];

    const oldList = target.querySelector(".survey-list");
    if (oldList) oldList.remove();

    surveys.forEach(q => addSurveyPoll(q));
}


    function addSurveyPoll(questionText) {

        const target =
            document.querySelectorAll(".section")[1]
            .querySelectorAll(".block")[1];

        let list = target.querySelector(".survey-list");
        if (!list) {
            list = document.createElement("div");
            list.className = "survey-list";
            target.appendChild(list);
        }

        const poll = document.createElement("div");
        poll.className = "poll";

        poll.innerHTML = `
            <div class="poll-question">${questionText}</div>

            <div class="poll-bars">
                <div class="poll-bar bar-yes">
                    <div class="poll-bar-fill" style="width:33%"></div>
                    <div class="poll-bar-label">😊 0 (33%)</div>
                </div>

                <div class="poll-bar bar-neutral">
                    <div class="poll-bar-fill" style="width:33%"></div>
                    <div class="poll-bar-label">😐 0 (33%)</div>
                </div>

                <div class="poll-bar bar-no">
                    <div class="poll-bar-fill" style="width:34%"></div>
                    <div class="poll-bar-label">☹️ 0 (34%)</div>
                </div>
            </div>

            <div class="poll-controls">
                <div class="poll-stats">Stimmen: 0</div>
                <div class="poll-del">
                    <button title="Umfrage löschen">🗑</button>
                </div>
            </div>
        `;

        poll.querySelector(".poll-del button").addEventListener("click", () => {
            removeSurvey(questionText);
            poll.remove();
        });

        list.appendChild(poll);
    }
});
