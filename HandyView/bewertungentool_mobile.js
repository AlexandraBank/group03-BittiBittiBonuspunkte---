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



	function savePolls() {
		try {
			localStorage.setItem(pollsKey, JSON.stringify(polls));
			try { if (window.BroadcastChannel) new BroadcastChannel('rating_polls').postMessage('updated'); } catch (e) {}
		} catch (e) { console.warn('Konnte polls nicht speichern', e); }
	}



	function loadVotes() { try { return JSON.parse(localStorage.getItem('rating_votes')||'{}'); } catch (e) { return {}; } }

	function saveVotes(votes) { try { localStorage.setItem('rating_votes', JSON.stringify(votes)); } catch (e) {} }

	function hasVoted(pollId) { var v = loadVotes(); return v && v[pollId] !== undefined; }

	function recordVoteLocal(pollId, choice) { var v = loadVotes(); v[pollId] = choice; saveVotes(v); }

	function createPollBar(className, emoji, count, pct) {
		const wrap = document.createElement('div');
		wrap.className = 'poll-bar ' + className;
		const fill = document.createElement('div');
		fill.className = 'poll-bar-fill';
		fill.style.width = pct + '%';
		const label = document.createElement('div');
		label.className = 'poll-bar-label';
		label.textContent = emoji + ' ' + count + ' (' + pct + '%)';
		wrap.appendChild(fill);
		wrap.appendChild(label);
		return wrap;
	}

	function createVoteButton(emoji, title, onClick) {
		const btn = document.createElement('button');
		btn.className = 'btn vote';
		btn.title = title;
		btn.textContent = emoji;
		btn.addEventListener('click', onClick);
		return btn;
	}

	function renderPolls() {
		const container = document.getElementById('polls');
		if (!container) return;
		container.innerHTML = '';
		const ratingPolls = (polls || []).filter(function (p) { return !Array.isArray(p.answers) || !p.answers.length; });
		if (!ratingPolls.length) {
			const p = document.createElement('p');
			p.textContent = 'Keine Bewertungen vorhanden.';
			container.appendChild(p);
			return;
		}
		ratingPolls.forEach(function (poll) {
			const box = document.createElement('div');
			box.className = 'poll';

			const q = document.createElement('div');
			q.className = 'poll-question';
			q.textContent = poll.text;
			box.appendChild(q);

			const bars = document.createElement('div');
			bars.className = 'poll-bars';

			const yes = poll.yes || 0;
			const no = poll.no || 0;
			const neutral = poll.neutral || 0;
			const total = yes + no + neutral;
			let yesPct, noPct, neutralPct;
			if (total === 0) {
				yesPct = 33; neutralPct = 33; noPct = 34;
			} else {
				yesPct = Math.round((yes / total) * 100);
				neutralPct = Math.round((neutral / total) * 100);
				noPct = 100 - yesPct - neutralPct;
			}

			bars.appendChild(createPollBar('bar-yes', '😊', yes, yesPct));
			bars.appendChild(createPollBar('bar-neutral', '😐', neutral, neutralPct));
			bars.appendChild(createPollBar('bar-no', '☹️', no, noPct));

			box.appendChild(bars);

			const controls = document.createElement('div');
			controls.className = 'poll-controls';


			controls.appendChild(createVoteButton('😊', 'Stimme: positiv', function () { votePoll(poll.id, 'yes'); }));
			controls.appendChild(createVoteButton('😐', 'Stimme: neutral', function () { votePoll(poll.id, 'neutral'); }));
			controls.appendChild(createVoteButton('☹️', 'Stimme: negativ', function () { votePoll(poll.id, 'no'); }));

			const stats = document.createElement('div');
			stats.className = 'poll-stats';
			stats.textContent = 'Stimmen: ' + total;
			controls.appendChild(stats);

			box.appendChild(controls);

			container.appendChild(box);
		});
	}

	function votePoll(id, choice) {
		const p = polls.find(function (x) { return x.id === id; });
		if (!p) return;
		if (hasVoted(id)) { alert('Du hast bereits abgestimmt.'); return; }

		var prevYes = p.yes || 0;
		var prevNeutral = p.neutral || 0;
		var prevNo = p.no || 0;
		var prevTotal = prevYes + prevNeutral + prevNo;
		var prevYesPct = prevTotal === 0 ? 0 : (prevYes / prevTotal) * 100;

		if (choice === 'yes') p.yes = (p.yes || 0) + 1;
		else if (choice === 'no') p.no = (p.no || 0) + 1;
		else if (choice === 'neutral') p.neutral = (p.neutral || 0) + 1;

		recordVoteLocal(id, choice);
		savePolls();
		renderPolls();


		var newYes = p.yes || 0;
		var newNeutral = p.neutral || 0;
		var newNo = p.no || 0;
		var newTotal = newYes + newNeutral + newNo;
		var newYesPct = newTotal === 0 ? 0 : (newYes / newTotal) * 100;

		try {
			if (prevYesPct <= 50 && newYesPct > 50) {
				showHamster();
		
				try {
					if (window.BroadcastChannel) {
						var ch = new BroadcastChannel('hci_channel');
						ch.postMessage({ type: 'hamster', pollId: id });
						ch.close();
					}
				} catch (err) { }
			}
		} catch (e) { }
	}


	function voteAnswer(id, answerIndex) {
		const p = polls.find(function (x) { return x.id === id; });
		if (!p || !Array.isArray(p.answers) || !p.answers[answerIndex]) return;

		var prevTotal = p.answers.reduce(function (acc, a) { return acc + (a.count || 0); }, 0) || 0;
		var prevMax = 0;
		for (var i = 0; i < p.answers.length; i++) {
			var pct = prevTotal ? Math.round(((p.answers[i].count || 0) / prevTotal) * 100) : 0;
			if (pct > prevMax) prevMax = pct;
		}

		p.answers[answerIndex].count = (p.answers[answerIndex].count || 0) + 1;

		savePolls();
		renderPolls();

		var newTotal = p.answers.reduce(function (acc, a) { return acc + (a.count || 0); }, 0) || 1;
		var newMax = 0;
		for (var j = 0; j < p.answers.length; j++) {
			var pctj = Math.round(((p.answers[j].count || 0) / newTotal) * 100);
			if (pctj > newMax) newMax = pctj;
		}

		try {
			if (prevMax <= 50 && newMax > 50) {
				showHamster();
				try {
					if (window.BroadcastChannel) {
						var ch2 = new BroadcastChannel('hci_channel');
						ch2.postMessage({ type: 'hamster', pollId: id });
						ch2.close();
					}
				} catch (err) {}
			}
		} catch (e) {}
	}


	function showHamster() {
		if (document.getElementById('hamsterOverlay')) return;
		var overlay = document.createElement('div');
		overlay.id = 'hamsterOverlay';
		overlay.className = 'hamster-overlay';

		var imgUrl = '/pictures/BittiHamster.jpg';

		var img = new Image();
		img.className = 'hamster-image';
		img.alt = 'Bitti Hamster';

		img.onload = function () {
			overlay.appendChild(img);
			document.body.appendChild(overlay);
			setTimeout(function () { try { overlay.remove(); } catch (e) {} }, 3000);
		};
		img.onerror = function () {
			overlay.innerHTML = '<div class="hamster-emoji">🐹</div>';
			document.body.appendChild(overlay);
			setTimeout(function () { try { overlay.remove(); } catch (e) {} }, 3000);
		};

		img.src = imgUrl;
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
			managePanel.setAttribute('aria-hidden', isHidden ? 'false' : 'true');
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
		const poll = { id: id, text: value, yes: 0, no: 0, neutral: 0, createdAt: Date.now() };
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
