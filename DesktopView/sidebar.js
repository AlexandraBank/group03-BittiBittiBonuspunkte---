document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const sub = btn.nextElementSibling;
            if (!sub) return;

            sub.classList.toggle('active');
        });
    });
});
