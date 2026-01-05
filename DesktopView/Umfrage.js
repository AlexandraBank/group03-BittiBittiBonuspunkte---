document.addEventListener("DOMContentLoaded", () => {

    const STORAGE_KEY = "savedSurveys";
    // set to true if surveys should also create a shared rating_polls entry
    const SHARE_WITH_RATING = false;

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

            // assign an id so we can reference this survey from other views
            const id = 'survey_' + Date.now();
            const survey = { id: id, question, answers };
            saveSurvey(survey);
            addSurveyPoll(survey);

            // optional: create a shared rating poll entry so mobile views can vote
            if (SHARE_WITH_RATING) {
                try {
                    const pollsKey = 'rating_polls';
                    var raw = localStorage.getItem(pollsKey);
                    var polls = raw ? JSON.parse(raw) : [];
                    // create a poll object that includes the multi-choice answers so mobile can render them
                    var pollObj = {
                        id: id,
                        text: question,
                        // store answers with counts so mobile can show options and votes
                        answers: answers.map(function (a) { return { text: a, count: 0 }; }),
                        createdAt: Date.now()
                    };
                    polls.unshift(pollObj);
                    localStorage.setItem(pollsKey, JSON.stringify(polls));
                    try { if (window.BroadcastChannel) new BroadcastChannel('rating_polls').postMessage('updated'); } catch (e) {}
                } catch (e) { console.warn('Could not create shared poll', e); }
            }

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

    // keep previous poll state to detect crossings (e.g. an answer passing 50%)
    var lastPollStates = {};

    function updateLastPollStatesFromLocal() {
        try {
            var raw = localStorage.getItem('rating_polls');
            var all = raw ? JSON.parse(raw) : [];
            all.forEach(function (p) {
                if (!p || !p.id) return;
                if (Array.isArray(p.answers) && p.answers.length) {
                    var total = p.answers.reduce(function (acc, a) { return acc + (a.count || 0); }, 0) || 1;
                    var maxPct = 0;
                    for (var i = 0; i < p.answers.length; i++) {
                        var pct = Math.round(((p.answers[i].count || 0) / total) * 100);
                        if (pct > maxPct) maxPct = pct;
                    }
                    lastPollStates[p.id] = maxPct;
                }
            });
        } catch (e) { /* ignore */ }
    }

    function loadSavedSurveys() {
        const surveys = getSavedSurveys();

        const target =
            document.querySelectorAll(".section")[1]
            .querySelectorAll(".block")[1];

        const oldList = target.querySelector(".survey-list");
        if (oldList) oldList.remove();

        surveys.forEach(s => addSurveyPoll(s));
        // initialize lastPollStates from any existing shared polls
        updateLastPollStatesFromLocal();
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
            if (!confirm('Diese Umfrage wirklich löschen?')) return;
            removeSurvey(survey.question);
            // remove shared poll if present
            try {
                const pollsKey = 'rating_polls';
                var raw = localStorage.getItem(pollsKey);
                var polls = raw ? JSON.parse(raw) : [];
                polls = polls.filter(p => p.id !== survey.id);
                localStorage.setItem(pollsKey, JSON.stringify(polls));
                try { if (window.BroadcastChannel) new BroadcastChannel('rating_polls').postMessage('updated'); } catch (e) {}
            } catch (e) {}
            poll.remove();
        };

        // store the survey id on the DOM element so it can be updated from storage events
        if (survey.id) poll.dataset.pollId = survey.id;

        list.appendChild(poll);
    }

    // Listen for changes to shared rating_polls so votes from mobile are reflected
    window.addEventListener('storage', function (e) {
        try {
            if (!e || !e.key) return;
            if (e.key === 'rating_polls') {
                var polls = JSON.parse(e.newValue || '[]');
                // update any poll elements that match by id
                polls.forEach(function (p) {
                    if (!p.id) return;
                    var el = document.querySelector('.survey-list .poll[data-poll-id="' + p.id + '"]');
                    if (el) {
                        // find bar labels and fills and update counts if present
                        var fills = el.querySelectorAll('.poll-bar-fill');
                        var labels = el.querySelectorAll('.poll-bar-label');
                            // support two shapes: legacy yes/no/neutral OR new multi-answer polls with p.answers array
                            if (Array.isArray(p.answers) && p.answers.length) {
                                var total = p.answers.reduce(function (acc, a) { return acc + (a.count || 0); }, 0) || 1;
                                // update fills/labels per answer
                                for (var i = 0; i < p.answers.length; i++) {
                                    var ans = p.answers[i];
                                    if (fills[i]) fills[i].style.width = Math.round(((ans.count||0)/total)*100) + '%';
                                    if (labels[i]) labels[i].textContent = (ans.text || '').split(' ')[0] + ' ' + (ans.count||0) + ' (' + Math.round(((ans.count||0)/total)*100) + '%)';
                                }
                                // detect if any answer crossed the 50% positive threshold (from <=50 to >50)
                                try {
                                    var maxPct = 0;
                                    for (var j = 0; j < p.answers.length; j++) {
                                        var pctj = Math.round(((p.answers[j].count || 0) / total) * 100);
                                        if (pctj > maxPct) maxPct = pctj;
                                    }
                                    var prev = lastPollStates[p.id] || 0;
                                    if (prev <= 50 && maxPct > 50) {
                                        try { showHamster(); } catch (e) {}
                                    }
                                    lastPollStates[p.id] = maxPct;
                                } catch (e) {}
                            } else {
                                var total = (p.yes||0) + (p.neutral||0) + (p.no||0) || 1;
                                if (fills.length >= 3) {
                                    fills[0].style.width = Math.round((p.yes/total)*100) + '%';
                                    fills[1].style.width = Math.round((p.neutral/total)*100) + '%';
                                    fills[2].style.width = Math.round((p.no/total)*100) + '%';
                                }
                                if (labels.length >=3) {
                                    labels[0].textContent = (labels[0].textContent.split(' ')[0]) + ' ' + (p.yes||0) + ' (' + Math.round((p.yes/total)*100) + '%)';
                                    labels[1].textContent = (labels[1].textContent.split(' ')[0]) + ' ' + (p.neutral||0) + ' (' + Math.round((p.neutral/total)*100) + '%)';
                                    labels[2].textContent = (labels[2].textContent.split(' ')[0]) + ' ' + (p.no||0) + ' (' + Math.round((p.no/total)*100) + '%)';
                                }
                            }
                    }
                });
            }
        } catch (err) { console.warn('storage update error', err); }
    });
});