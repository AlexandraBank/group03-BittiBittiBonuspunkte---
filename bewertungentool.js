document.addEventListener('DOMContentLoaded', function () {
	const popup = document.getElementById('popup');
	const closeBtn = document.getElementById('closePopupBtn');
	const saveBtn = document.getElementById('saveBtn');
	const showSuggestionsBtn = document.getElementById('showSuggestionsBtn');
	const suggestionsEl = document.getElementById('suggestions');
	const suggestionsListEl = document.getElementById('suggestionsList');
	const manageBtn = document.getElementById('manageBtn');
	const managePanel = document.getElementById('managePanel');
	const newSuggestionInput = document.getElementById('newSuggestionInput');
	const addSuggestionBtn = document.getElementById('addSuggestionBtn');
	const manageList = document.getElementById('manageList');
	const textarea = document.getElementById('ratingText');
	const cancelBtn = document.getElementById('cancelBtn');


	const storageKey = 'rating_suggestions';

	(function loadSuggestions() {
		const stored = localStorage.getItem(storageKey);
		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				if (Array.isArray(parsed) && parsed.length) {
					suggestions = parsed;
					return;
				}
			} catch (e) {
				console.warn('Lokale Vorschläge konnten nicht gelesen werden.', e);
			}
		}

		fetch('suggestions.json')
			.then(function (res) {
				if (!res.ok) throw new Error('Network response was not ok');
				return res.json();
			})
			.then(function (data) {
				if (Array.isArray(data) && data.length) {
					suggestions = data;
				}
			})
			.catch(function (err) {
				console.warn('Konnte suggestions.json nicht laden, verwende Standard-Vorschläge.', err);
			});
	})();

	function saveSuggestionsToStorage() {
		try {
			localStorage.setItem(storageKey, JSON.stringify(suggestions));
		} catch (e) {
			console.warn('Konnte Vorschläge nicht in localStorage speichern.', e);
		}
	}

	const pollsKey = 'rating_polls';
	let polls = [];

	function loadPolls() {
		try {
			const raw = localStorage.getItem(pollsKey);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) polls = parsed;
			}
		} catch (e) { console.warn('Konnte polls nicht laden', e); }
	}

	function deletePoll(id) {
		const idx = polls.findIndex(function (x) { return x.id === id; });
		if (idx === -1) return;
		polls.splice(idx, 1);
		savePolls();
		renderPolls();
	}

	function savePolls() {
		try {
			localStorage.setItem(pollsKey, JSON.stringify(polls));
		} catch (e) { console.warn('Konnte polls nicht speichern', e); }
	}

	function renderPolls() {
		const container = document.getElementById('polls');
		if (!container) return;
		container.innerHTML = '';
		if (!polls.length) {
			const p = document.createElement('p');
			p.textContent = 'Keine Fragen zum Bewerten vorhanden. Erstelle eine neue Frage bei der die Studenten mit ja/nein abstmmen können.';
			container.appendChild(p);
			return;
		}
		polls.forEach(function (poll) {
			const box = document.createElement('div');
			box.className = 'poll';

			const q = document.createElement('div');
			q.className = 'poll-question';
			q.textContent = poll.text;
			box.appendChild(q);

			const bars = document.createElement('div');
			bars.className = 'poll-bars';

			const total = (poll.yes || 0) + (poll.no || 0) || 0;
			const yesPct = total === 0 ? 50 : Math.round(((poll.yes || 0) / total) * 100);
			const noPct = total === 0 ? 50 : 100 - yesPct;

			//Abstimmung ja
			const yesWrap = document.createElement('div');
			yesWrap.className = 'poll-bar bar-yes';
			const yesFill = document.createElement('div');
			yesFill.className = 'poll-bar-fill';
			yesFill.style.width = yesPct + '%';
			const yesLabel = document.createElement('div');
			yesLabel.className = 'poll-bar-label';
			yesLabel.textContent = 'Ja ' + (poll.yes || 0) + ' (' + yesPct + '%)';
			yesWrap.appendChild(yesFill);
			yesWrap.appendChild(yesLabel);
			bars.appendChild(yesWrap);

			//Abstimmung nein
			const noWrap = document.createElement('div');
			noWrap.className = 'poll-bar bar-no';
			const noFill = document.createElement('div');
			noFill.className = 'poll-bar-fill';
			noFill.style.width = noPct + '%';
			const noLabel = document.createElement('div');
			noLabel.className = 'poll-bar-label';
			noLabel.textContent = 'Nein ' + (poll.no || 0) + ' (' + noPct + '%)';
			noWrap.appendChild(noFill);
			noWrap.appendChild(noLabel);
			bars.appendChild(noWrap);

			box.appendChild(bars);


			//Abstimmungs-Buttons und Statistik
			const controls = document.createElement('div');
			controls.className = 'poll-controls';
			const yesBtn = document.createElement('button');
			yesBtn.className = 'btn vote';
			yesBtn.textContent = 'Ja';
			yesBtn.addEventListener('click', function () { votePoll(poll.id, 'yes'); });
			const noBtn = document.createElement('button');
			noBtn.className = 'btn vote';
			noBtn.textContent = 'Nein';
			noBtn.addEventListener('click', function () { votePoll(poll.id, 'no'); });
			controls.appendChild(yesBtn);
			controls.appendChild(noBtn);
			const stats = document.createElement('div');
			stats.className = 'poll-stats';
			stats.textContent = 'Stimmen: ' + total;
			controls.appendChild(stats);

			//Papierkorb
			const delWrap = document.createElement('div');
			delWrap.className = 'poll-del';
			const delBtn = document.createElement('button');
			delBtn.type = 'button';
			delBtn.title = 'Bewertung löschen';
			delBtn.innerHTML = '🗑';
			delBtn.addEventListener('click', function () {
				if (confirm('Diese Bewertung wirklich löschen?')) deletePoll(poll.id);
			});
			delWrap.appendChild(delBtn);
			controls.appendChild(delWrap);

			box.appendChild(controls);

			container.appendChild(box);
		});
	}

	function votePoll(id, choice) {
		const p = polls.find(function (x) { return x.id === id; });
		if (!p) return;
		if (choice === 'yes') p.yes = (p.yes || 0) + 1;
		else p.no = (p.no || 0) + 1;
		savePolls();
		renderPolls();
	}

	window.openPopup = function () {
		popup.style.display = 'flex';
		popup.setAttribute('aria-hidden', 'false');
		rebuildSuggestions();
		renderManageList();
		managePanel && managePanel.setAttribute('aria-hidden', 'true');
		textarea.focus();
	};

	window.closePopup = function () {
		popup.style.display = 'none';
		popup.setAttribute('aria-hidden', 'true');
		hideSuggestions();
	};


		function buildSuggestionsIfNeeded() {
			if (!suggestionsListEl) return;
			if (!suggestionsListEl.hasChildNodes()) {
				rebuildSuggestions();
			}
		}

		function rebuildSuggestions() {
			if (!suggestionsListEl) return;
			suggestionsListEl.innerHTML = '';
			suggestions.forEach(function (s) {
				const item = document.createElement('div');
				item.className = 'suggestion-item';
				item.setAttribute('role', 'menuitem');
				item.tabIndex = 0;
				item.textContent = s;
				item.addEventListener('click', function () {
					insertSuggestion(s);
					hideSuggestions();
				});
				item.addEventListener('keydown', function (e) {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						insertSuggestion(s);
						hideSuggestions();
					}
				});
				suggestionsListEl.appendChild(item);
			});
		}

		function showSuggestions() {
				buildSuggestionsIfNeeded();
				suggestionsEl.style.display = 'block';
				suggestionsEl.setAttribute('aria-hidden', 'false');
				showSuggestionsBtn.setAttribute('aria-expanded', 'true');
				const chevron = showSuggestionsBtn.querySelector('.chevron');
				if (chevron) chevron.textContent = '▴';
			}

		function hideSuggestions() {
			suggestionsEl.style.display = 'none';
			suggestionsEl.setAttribute('aria-hidden', 'true');
			showSuggestionsBtn.setAttribute('aria-expanded', 'false');
			const chevron = showSuggestionsBtn.querySelector('.chevron');
			if (chevron) chevron.textContent = '▾';
		}

		function toggleSuggestions() {
				if (suggestionsEl.style.display === 'block') hideSuggestions(); else showSuggestions();
			}

		function renderManageList() {
			if (!manageList) return;
			manageList.innerHTML = '';
			suggestions.forEach(function (s, idx) {
				const li = document.createElement('li');
				const span = document.createElement('span');
				span.textContent = s;
				const del = document.createElement('button');
				del.className = 'del-btn';
				del.textContent = 'Löschen';
				del.addEventListener('click', function () {
					deleteSuggestion(idx);
				});
				li.appendChild(span);
				li.appendChild(del);
				manageList.appendChild(li);
			});
		}

		function toggleManagePanel() {
			if (!managePanel) return;
			const isHidden = managePanel.getAttribute('aria-hidden') === 'true';
			// toggle
			managePanel.setAttribute('aria-hidden', isHidden ? 'false' : 'true');
			// always refresh the list; when panel becomes visible, focus input
			renderManageList();
			if (isHidden) newSuggestionInput && newSuggestionInput.focus();
		}

		function addSuggestion() {
			if (!newSuggestionInput) return;
			const v = newSuggestionInput.value.trim();
			if (!v) return;
			suggestions.unshift(v);
			saveSuggestionsToStorage();
			rebuildSuggestions();
			renderManageList();
			newSuggestionInput.value = '';
			newSuggestionInput.focus();
		}

		function deleteSuggestion(idx) {
			if (idx < 0 || idx >= suggestions.length) return;
			suggestions.splice(idx, 1);
			saveSuggestionsToStorage();
			rebuildSuggestions();
			renderManageList();
		}

	function insertSuggestion(text) {
		textarea.value = text;
		textarea.focus();
	}

	function saveRating() {
		const value = textarea.value.trim();
		if (!value) {
			alert('Bitte gib einen Text ein oder wähle einen Vorschlag.');
			textarea.focus();
			return;
		}
		const id = 'poll_' + Date.now();
		const poll = { id: id, text: value, yes: 0, no: 0, createdAt: Date.now() };
		polls.unshift(poll);
		savePolls();
		renderPolls();
		try {
			if (window.opener && window.opener !== window) {
				try {
					window.opener.postMessage({ type: 'pollSaved', poll: poll }, '*');
				} catch (e) {}
				setTimeout(function () { try { window.close(); } catch (e) {} }, 50);
				return;
			}
		} catch (e) {}
		closePopup();
	}

	closeBtn.addEventListener('click', closePopup);
	saveBtn.addEventListener('click', saveRating);
	cancelBtn && cancelBtn.addEventListener('click', closePopup);
	manageBtn && manageBtn.addEventListener('click', function (e) {
		e.stopPropagation();
		toggleManagePanel();
	});
	addSuggestionBtn && addSuggestionBtn.addEventListener('click', function (e) {
		e.preventDefault();
		addSuggestion();
	});
	if (newSuggestionInput) {
		newSuggestionInput.addEventListener('keydown', function (e) {
			if (e.key === 'Enter') {
				e.preventDefault();
				addSuggestion();
			}
		});
	}
	showSuggestionsBtn.addEventListener('click', toggleSuggestions);


	loadPolls();
	renderPolls();

	try {
		if (window.location && window.location.search && window.location.search.indexOf('popup=1') !== -1) {
			setTimeout(function () {
				if (typeof window.openPopup === 'function') window.openPopup();
			}, 60);
		}
	} catch (e) {}


	window.addEventListener('storage', function (e) {
		try {
			if (!e || !e.key) return;
			if (e.key === pollsKey) {
				loadPolls();
				renderPolls();
			}
		} catch (err) { console.warn('Fehler in storage listener', err); }
	});

	window.addEventListener('message', function (ev) {
		try {
			var data = ev.data || {};
			if (data && data.type === 'reloadPolls') {
				loadPolls();
				renderPolls();
			}
		} catch (err) {  }
	});


	popup.addEventListener('click', function (e) {
		if (e.target === popup) closePopup();
	});


	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape' && popup.style.display === 'flex') {
			closePopup();
		}
	});
});
