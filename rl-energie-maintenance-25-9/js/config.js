'use strict';
/* R.L ENERGIE — Réglages de l'envoi des codes par e-mail (service EmailJS, voir LISEZ-MOI.txt).
   service / template / key vides = récupération par e-mail désactivée.
   L'adresse qui reçoit le code n'est PAS ici : elle se règle dans l'app (Gestion > Droits & accès > E-mail de récupération).
   ttl = validité du code (minutes) · cool = secondes entre deux demandes · maxSend = demandes par heure · maxTry = essais par code */
/* Service EmailJS : service, template et key (Public Key, PAS la Private Key) sont renseignés.
   Tant que l'un des trois est vide, le lien « Mot de passe oublié ? » indique simplement que la fonction n'est pas activée.
   Variables envoyées au modèle EmailJS : {{to_email}} {{code}} {{minutes}} {{app}} */
const RESET={service:'service_5s8ui9i',template:'template_5sh8a0r',key:'jLNuHzEOGvpl48bQb',ttl:10,cool:60,maxSend:6,maxTry:5};
