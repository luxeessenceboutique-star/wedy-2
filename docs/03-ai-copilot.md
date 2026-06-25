# Copilote IA

## Vue d'ensemble

Le Copilote IA est un assistant conversationnel intégré à Wedy RH, alimenté par **Claude AI (Anthropic)**. Il comprend le contexte RH marocain et a accès à vos données employés pour vous assister dans vos tâches quotidiennes.

**URL :** `/app/copilot`  
**Accès :** Admin, RH Manager  
**Technologie :** Claude API (Anthropic)

---

## Ce que le Copilote peut faire

### Génération de documents
Demandez au Copilote de rédiger n'importe quel document RH en langage naturel :
```
"Rédige une attestation de travail pour Yasmine Benali, 
 en poste depuis le 15 mars 2022 en tant que Responsable Marketing."
```

### Réponses RH & juridiques
Posez des questions sur le droit du travail marocain :
```
"Quel est le délai de préavis légal pour un CDI au Maroc ?"
"Combien de jours de congé annuel sont obligatoires selon le Code du Travail 2026 ?"
```

### Amélioration de textes
Collez un texte existant et demandez une amélioration :
```
"Améliore ce mail de refus de candidature pour qu'il soit plus professionnel et bienveillant."
```

### Analyse et synthèse
Demandez des analyses à partir de vos données :
```
"Quels sont les départements avec le plus fort taux d'absentéisme ce trimestre ?"
```

---

## Commandes rapides

| Commande | Action |
|---|---|
| `/doc [type] [nom employé]` | Génère un document directement |
| `/emp [nom]` | Affiche la fiche de l'employé |
| `/congé [nom]` | Affiche le solde de congés |
| `/aide` | Affiche les commandes disponibles |

---

## Bonnes pratiques

1. **Soyez précis** : mentionnez le nom complet de l'employé et les dates exactes pour de meilleurs résultats.
2. **Copiez la réponse** : le bouton de copie en bas à droite de chaque réponse copie le texte en un clic.
3. **Itérez** : si le résultat ne correspond pas, précisez votre demande dans le message suivant.
4. **Confidentialité** : les conversations ne sont pas stockées au-delà de la session en cours.

---

## Limites actuelles

- Le Copilote ne peut pas effectuer d'actions directes dans la plateforme (créer un employé, approuver un congé, etc.) — il génère du contenu que vous appliquez manuellement.
- Les réponses juridiques sont indicatives et ne remplacent pas un conseil d'un avocat spécialisé.
