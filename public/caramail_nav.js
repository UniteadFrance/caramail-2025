// caramail_nav.js — crée des liens fonctionnels sur les onglets
(function(){
  const map = {
    "Salon": "caramail_salon_live.html",
    "Connecté(e)s": "caramail_connectes.html",
    "Options": "caramail_options.html",
    "Ami(e)s": "caramail_amis.html",
    "Mon compte": "caramail_compte_mobile.html", // ou caramail_compte.html si tu préfères
    "Utilisateurs bloqués": "caramail_bloques_mobile.html" // si présent dans la barre
  };

  const tabs = document.querySelectorAll('.topbar .tab, .tabs .tab');
  tabs.forEach(tab => {
    const label = tab.textContent.trim();
    const href = map[label];
    if(!href) return;
    // Transforme le tab en lien accessible
    const link = document.createElement('a');
    link.href = href;
    link.innerHTML = tab.innerHTML;
    link.style.textDecoration = 'none';
    link.style.color = 'inherit';
    // Remplace le contenu du tab par le lien
    tab.innerHTML = '';
    tab.appendChild(link);
    // Active l'onglet si on est sur la page cible
    const isActive = location.pathname.endsWith('/'+href) || location.pathname.endsWith(href);
    if(isActive) tab.classList.add('active');
  });
})();