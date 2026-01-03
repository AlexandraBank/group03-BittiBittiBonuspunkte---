function setActive(buttonId) {

  document.querySelectorAll(".bottom-nav button")
    .forEach(btn => btn.classList.remove("active"));

  document.getElementById(buttonId).classList.add("active");

  if (buttonId === "home") {
    window.location.href = "mainDisplay.html";
  } else if (buttonId === "fragen") {
    window.location.href = "fragen.html";
  } else if (buttonId === "raeume") {
    window.location.href = "raeume.html";
  }
}
