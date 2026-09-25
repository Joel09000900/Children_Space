// Applique le thème mémorisé avant le premier rendu, pour éviter un flash sombre
// chez les visiteurs en thème clair. Fichier séparé (et non script en ligne)
// pour rester compatible avec la CSP `script-src 'self'`.
try {
  document.documentElement.dataset.theme = localStorage.getItem("olikrys-theme") === "light" ? "light" : "dark";
} catch (e) {
  /* localStorage indisponible : on garde le thème sombre par défaut */
}
