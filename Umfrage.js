document.addEventListener("DOMContentLoaded", () => {

    fetch("Umfrage.html")
        .then(res => res.text())
        .then(html => {
            document.getElementById("surveyContainer").innerHTML = html;
            initUmfrage();
        })
        .catch(err => console.error("Umfrage HTML konnte nicht geladen werden", err));

    function initUmfrage() {
        const openBtn = document.getElementById("openSurveyBtn");
        const overlay = document.getElementById("surveyOverlay");
        const closeBtn = document.getElementById("closeSurveyBtn");
        const cancelBtn = document.getElementById("cancelSurveyBtn");
        const confirmBtn = document.getElementById("confirmSurveyBtn");
        const textarea = document.getElementById("surveyQuestion");

        if (!openBtn || !overlay) {
            console.error("Umfrage: Button oder Overlay fehlt");
            return;
        }

        openBtn.addEventListener("click", () => {
            overlay.style.display = "flex";
            textarea.focus();
        });

        function close() {
            overlay.style.display = "none";
            textarea.value = "";
        }

        closeBtn.addEventListener("click", close);
        cancelBtn.addEventListener("click", close);

        confirmBtn.addEventListener("click", () => {
            const question = textarea.value.trim();
            if (!question) {
                alert("Bitte eine Frage eingeben");
                return;
            }

            console.log("Umfrage:", question);
            close();
        });

        overlay.addEventListener("click", e => {
            if (e.target === overlay) close();
        });
    }
});
