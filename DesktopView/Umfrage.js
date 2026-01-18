document.addEventListener("DOMContentLoaded", () => {

    const STORAGE_KEY = "savedSurveys";
    const SHARE_WITH_RATING = false;

    const container = document.getElementById("surveyContainer");
    const openBtn = document.getElementById("openSurveyBtn");

    if (!container || !openBtn) return;

    loadSavedSurveys();
    updateLastPollStatesFromLocal();
    updatePollsFromVotes();

    openBtn.addEventListener("click", () => {

        container.innerHTML = `
            <div class="popup-overlay" id="surveyOverlay">
                <div class="popup-content">
                    <button class="close-btn" id="closeSurveyBtn">&times;</button>
                    <h2>Umfrage erstellen</h2>

                    <p class="was">Gib eine Frage ein:</p>
                    <textarea id="surveyQuestion" rows="5"></textarea>

                    <p class="was">Antwortmöglichkeiten:</p>
                    <div id="answerList" class="answerList"></div>


                    
                    

                    <button class="btn small border" id="addAnswerBtn">+ Antwort hinzufügen</button>

                    <div class="controls survey">
                        <div></div>
                        <button class="btn" id="cancelSurveyBtn" >Abbrechen</button>
                        <button class="btn primary" id="confirmSurveyBtn">Bestätigen</button>
                    </div>


                </div>
            </div>
        `;

        const overlay = document.getElementById("surveyOverlay");
        const close = () => overlay.remove();

        const cancelBtn = document.getElementById("cancelSurveyBtn");
        if (cancelBtn) {
            cancelBtn.hidden = true; 

        }

        document.getElementById("closeSurveyBtn").onclick = close;
        document.getElementById("cancelSurveyBtn").onclick = close;

        const answerList = document.getElementById("answerList");


        const addAnswerField = (value = "", removable = true) => {
            const row = document.createElement("div");
            row.className = "answer-row";

            const buttonHTML = removable 
                ? '<button class="remove-answer">✕</button>'
                : '<div style="min-width:24px;"></div>'; 

            row.innerHTML = `
                <input type="text" class="answer-input" value="${value}">
                ${buttonHTML}
            `;

            if (removable) {
                row.querySelector(".remove-answer").onclick = () => row.remove();
            }

            answerList.appendChild(row);
        };

        addAnswerField("",false);
        addAnswerField("",false);

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


            const id = 'survey_' + Date.now();
            const survey = { id: id, question, answers };
            saveSurvey(survey);
            addSurveyPoll(survey);


            if (SHARE_WITH_RATING) {
                try {
                    const pollsKey = 'rating_polls';
                    var raw = localStorage.getItem(pollsKey);
                    var polls = raw ? JSON.parse(raw) : [];
                    var pollObj = {
                        id: id,
                        text: question,
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

        const oldMsg = target.querySelector(".survey-empty-text");
        if (oldMsg) oldMsg.remove();

        if(surveys.length == 0) {
            let list = target.querySelector('.survey-list');
            if (!list) {
                list = document.createElement('div');
                list.className = 'survey-list';
                target.appendChild(list);
            }
            list.innerHTML = '';
            const p = document.createElement("p");
            p.className = "survey-empty-text";
            p.textContent = "Keine Umfragen vorhanden. Erstelle eine neue Umfrage über den Button rechts.";
            list.appendChild(p);
            return;
        }

        surveys.forEach(s => addSurveyPoll(s));
        updateLastPollStatesFromLocal();
        updatePollsFromVotes();
    }

    function addSurveyPoll(survey) {

        const target =
            document.querySelectorAll(".section")[1]
            .querySelectorAll(".block")[1];

        const emptyMsg = target.querySelector(".survey-empty-text");
        if (emptyMsg) emptyMsg.remove();

        let list = target.querySelector(".survey-list");
        if (!list) {
            list = document.createElement("div");
            list.className = "survey-list";
            target.appendChild(list);
        }

        const poll = document.createElement("div");
        poll.className = "poll";

        const percent = Math.floor(100 / survey.answers.length);
        const colorClasses = ['bar-yes', 'bar-neutral', 'bar-no'];

        poll.innerHTML = `
            <div class="poll-question">${survey.question}</div>

            <div class="poll-bars">
                ${survey.answers.map((a, i) => {
                    const colorClass = colorClasses[i % colorClasses.length];
                    return `
                    <div class="poll-bar ${colorClass}">
                        <div class="poll-bar-fill" style="width:${percent}%"></div>
                        <div class="poll-bar-label">${a} (${percent}%)</div>
                    </div>
                `
                }).join("")}
            </div>
                    <div class="poll-stats">Stimmen: 0</div>
            <div class="poll-controls">
                <div class="poll-del">
                    <button title="Umfrage löschen">🗑</button>
                </div>
            </div>
        `;

            poll.querySelector(".poll-del button").onclick = () => {
            if (!confirm('Diese Umfrage wirklich löschen?')) return;

            removeSurvey(survey.question);
            try {
                const pollsKey = 'rating_polls';
                var raw = localStorage.getItem(pollsKey);
                var polls = raw ? JSON.parse(raw) : [];
                polls = polls.filter(p => p.id !== survey.id);
                localStorage.setItem(pollsKey, JSON.stringify(polls));
                try { 
                    if (window.BroadcastChannel) new BroadcastChannel('rating_polls').postMessage('updated'); 
                } catch (e) {}
            } catch (e) {}

            poll.remove();

                const list = target.querySelector('.survey-list');
                if (!list) {
                    const newList = document.createElement('div');
                    newList.className = 'survey-list';
                    target.appendChild(newList);
                    const p = document.createElement('p');
                    p.className = 'survey-empty-text';
                    p.textContent = 'Keine Umfragen vorhanden. Erstelle eine neue Umfrage.';
                    newList.appendChild(p);
                } else if (list.children.length === 0) {
                    list.innerHTML = '';
                    const p = document.createElement('p');
                    p.className = 'survey-empty-text';
                    p.textContent = 'Keine Umfragen vorhanden. Erstelle eine neue Umfrage über den Button rechts.';
                    list.appendChild(p);
                }
            };


        if (survey.id) poll.dataset.pollId = survey.id;

        list.appendChild(poll);
    }

    function updatePollsFromVotes() {
        const rawVotes = localStorage.getItem('rating_votes');
        const votes = rawVotes ? JSON.parse(rawVotes) : {};

        const polls = document.querySelectorAll(".survey-list .poll");

        polls.forEach(poll => {
            const pollId = poll.dataset.pollId;
            if (!pollId) return;

            const fillElems = poll.querySelectorAll(".poll-bar-fill");
            const labelElems = poll.querySelectorAll(".poll-bar-label");

         
            const pollVoteKeys = Object.keys(votes).filter(voteKey => voteKey && voteKey.indexOf(pollId) !== -1);

            const answerCounts = {};

            pollVoteKeys.forEach(voteKey => {
                const raw = votes[voteKey];
                let answerIndex = NaN;

                if (typeof raw === 'number') {
                    answerIndex = raw;
                } else if (typeof raw === 'string') {

                    if (raw.indexOf(':') !== -1) {
                        const parts = raw.split(':');

                        answerIndex = parseInt(parts[parts.length - 1], 10);
                    } else {
                        answerIndex = parseInt(raw, 10);
                    }
                }

                if (!isNaN(answerIndex)) {
                    answerCounts[answerIndex] = (answerCounts[answerIndex] || 0) + 1;
                }
            });

            const totalVotes = Object.values(answerCounts).reduce((a, b) => a + b, 0);

            Array.from(fillElems).forEach((fillElem, index) => {
                const ansVotes = answerCounts[index] || 0;
                const percent = totalVotes ? Math.round((ansVotes / totalVotes) * 100) : 0;
                fillElem.style.width = `${percent}%`;
            });

            Array.from(labelElems).forEach((labelElem, index) => {
                const ansVotes = answerCounts[index] || 0;
                const percent = totalVotes ? Math.round((ansVotes / totalVotes) * 100) : 0;
                const baseText = labelElem.textContent.replace(/\s*\([^\)]*\)\s*$/, '').trim();
                labelElem.textContent = `${baseText} (${percent}%)`;
            });

            const statsElem = poll.querySelector(".poll-stats");
            if (statsElem) {
                statsElem.textContent = `Stimmen: ${totalVotes}`;
            }
        });
    }

  
    window.addEventListener('storage', function (e) {
        try {
            if (!e || !e.key) return;

            if (e.key === 'rating_polls') {
                var polls = JSON.parse(e.newValue || '[]');

                polls.forEach(function (p) {
                    if (!p.id) return;
                    var el = document.querySelector('.survey-list .poll[data-poll-id="' + p.id + '"]');
                    if (el) {

                        var fills = el.querySelectorAll('.poll-bar-fill');
                        var labels = el.querySelectorAll('.poll-bar-label');

                        if (Array.isArray(p.answers) && p.answers.length) {
                            var total = p.answers.reduce(function (acc, a) { return acc + (a.count || 0); }, 0) || 1;
    
                            for (var i = 0; i < p.answers.length; i++) {
                                var ans = p.answers[i];
                                if (fills[i]) fills[i].style.width = Math.round(((ans.count||0)/total)*100) + '%';
                                if (labels[i]) labels[i].textContent = (ans.text || '').split(' ')[0] + ' ' + (ans.count||0) + ' (' + Math.round(((ans.count||0)/total)*100) + '%)';
                            }

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


            if (e.key === 'rating_votes') {
                try { updatePollsFromVotes(); } catch (err) { console.warn('updatePollsFromVotes error', err); }
            }
        } catch (err) { console.warn('storage update error', err); }
    });
});
