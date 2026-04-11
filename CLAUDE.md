# Claude Code — règles du projet

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
