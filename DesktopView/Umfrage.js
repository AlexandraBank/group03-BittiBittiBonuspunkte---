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

                    <p>Frage:</p>
                    <textarea id="surveyQuestion" rows="3"></textarea>

                    <p>Antwortmöglichkeiten:</p>
                    <div id="answerList"></div>

                    <button class="btn small" id="addAnswerBtn">+ Antwort hinzufügen</button>

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

        const answerList = document.getElementById("answerList");

        const addAnswerField = (value = "") => {
            const row = document.createElement("div");
            row.className = "answer-row";

            row.innerHTML = `
                <input type="text" class="answer-input" value="${value}">
                <button class="remove-answer">✕</button>
            `;

            row.querySelector(".remove-answer").onclick = () => row.remove();
            answerList.appendChild(row);
        };

        document.getElementById("addAnswerBtn").onclick = () => addAnswerField();

        document.getElementById("confirmSurveyBtn").onclick = () => {
            const question = document.getElementById("surveyQuestion").value.trim();
            const answers = [...answerList.querySelectorAll(".answer-input")]
                .map(i => i.value.trim())
                .filter(Boolean);

            if (!question || answers.length < 2) {
                alert("Bitte eine Frage und mindestens zwei Antworten eingeben.");
                return;
            }

            const survey = { question, answers };
            saveSurvey(survey);
            addSurveyPoll(survey);
            close();
        };

        overlay.addEventListener("click", e => {
            if (e.target === overlay) close();
        });
    });

    function getSavedSurveys() {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    }

    function saveSurvey(survey) {
        const surveys = getSavedSurveys();
        surveys.push(survey);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(surveys));
    }

    function removeSurvey(question) {
        let surveys = getSavedSurveys();
        surveys = surveys.filter(s => s.question !== question);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(surveys));
    }

    function loadSavedSurveys() {
        const surveys = getSavedSurveys();

        const target =
            document.querySelectorAll(".section")[1]
            .querySelectorAll(".block")[1];

        const oldList = target.querySelector(".survey-list");
        if (oldList) oldList.remove();

        surveys.forEach(s => addSurveyPoll(s));
    }

    function addSurveyPoll(survey) {

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

        const percent = Math.floor(100 / survey.answers.length);

        poll.innerHTML = `
            <div class="poll-question">${survey.question}</div>

            <div class="poll-bars">
                ${survey.answers.map(a => `
                    <div class="poll-bar">
                        <div class="poll-bar-fill" style="width:${percent}%"></div>
                        <div class="poll-bar-label">${a} (${percent}%)</div>
                    </div>
                `).join("")}
            </div>

            <div class="poll-controls">
                <div class="poll-del">
                    <button title="Umfrage löschen">🗑</button>
                </div>
            </div>
        `;

        poll.querySelector(".poll-del button").onclick = () => {
            removeSurvey(survey.question);
            poll.remove();
        };

        list.appendChild(poll);
    }
});
