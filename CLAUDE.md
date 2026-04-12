# Claude Code — règles du projet

## Gestion des issues

### Avant de commencer une issue
1. Vérifier qu'aucune PR n'est en attente de merge (`gh pr list`)
2. Puller main et tirer une nouvelle branche dédiée à l'issue

### Avant de créer la PR
1. `npm run lint` — aucune erreur tolérée
2. `npm run test` — tous les tests doivent passer
3. Vérifier le rendu dans la preview navigateur

### Issues complexes
Quand une issue est marquée comme complexe (décision prise au moment de sa création), suivre ce processus séquentiel :

1. **Recherche** — explorer la codebase et les solutions existantes ; poser des questions pour clarifier la demande si besoin
2. **Proposition de plan** — soumettre une approche et attendre validation avant de coder
3. **Implémentation** — développer le plan validé
4. **Tests** — écrire ou mettre à jour les tests associés
5. **Code review** — présenter les changements pour relecture
6. **Itération** — corriger en fonction des retours et recommencer si nécessaire

---

## Qualité du code

Avant de proposer ou de merger une PR, toujours vérifier que ces deux commandes passent sans erreur :

```bash
npm run lint    # ESLint — aucune erreur tolérée
npm run test    # Vitest — tous les tests doivent passer
```

Si du nouveau code est ajouté ou modifié :
- Les fonctions utilitaires dans `src/lib/` et `scripts/` doivent avoir des tests associés
- Les composants avec une logique non triviale doivent avoir au moins un test de rendu
- Ne jamais désactiver une règle ESLint (`// eslint-disable`) sans expliquer pourquoi en commentaire
