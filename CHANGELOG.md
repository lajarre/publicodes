# Changelog

## next

**publicodes-react**

-   Corrige un bug d'affichage dans la documentation lié aux conversions d'unités

## 1.0.0-beta.32

**core**

-   ⚠ Changement cassant : Nouvelles valeurs littérales pour les règles non applicables (`null`) et non définies (`undefined`)
    cf. https://github.com/betagouv/publicodes/discussions/158#discussioncomment-2132390
-   Nouvelle implémentation de la désactivation de branche pour éviter la remontée de « variables manquantes » inattendues
-   ⚠ Changement cassant : La fonction `parsePublicodes` retourne maintenant un objet `{ parsedRules, ruleUnits, rulesDependencies }` et non plus les seules règles parsées

**publicodes-react**

-   Améliore le style des mécanismes imbriqués dans une somme

## 1.0.0-beta.31

**publicodes-react**

-   La description des mécanismes est disponible via un lien plutôt qu'une modale dans la page
-   Amélioration des styles par défaut pour les mécanismes
-   Suppressions des dépendances à focus-trap-react
-   Ajout de la visualisation pour le mécanisme texte
-   Répare le style de l'overlay qui s'affiche pour les remplacements #126

**publicodes**

-   Ajoute un nouveau mécanisme `texte` pour l'interpolation de chaine de caractère #152
-   Le formattage des chaine de caractère via `formatValue` ne transforme plus la première lettre en capitale
-   Ajoute la possibilité d'avoir des espaces après une parenthèse dans une expression publicodes
-   Ajoute la possibilité de définir une expression publicodes sur plusieurs lignes

## 1.0.0-beta.30

**publicodes-react**

-   Correction d'une erreur de runtime JSX manquant dans la version ESModule.

## 1.0.0-beta.29

**publicodes-react**

-   Publication des 2 formats : CommonJS et ESModule

## 1.0.0-beta.28

**publicodes-react**

-   Retour en publication CommonJS

## 1.0.0-beta.27

**publicodes-react**

-   Correction d'un type de renderer
-   Le paquet est désormais publié sous forme d'ES Module

**core**

-   Réparation des tests mocha

## 1.0.0-beta.26

**publicodes-react**

-   ⚠ Changement cassant: `react-markdown` n'est plus utilisé pour afficher les textes. L'utilisateur peut fournir son propre composant de rendu.

## 1.0.0-beta.25

**core**

-   Correction: Import Node.js UMD

## 1.0.0-beta.24

**core**

-   Correction: Import dans le REPL svelte.dev

## 1.0.0-beta.23

**core**

-   Corrige l'ordre des règles imbriquées dans l'objet parsedRules

## 1.0.0-beta.22

**core**

-   Correction: Build en mode "production"

## 1.0.0-beta.20

**core**

-   Corrige l'omission des types Typescript dans le paquet

## 1.0.0-beta.19

**core**

-   Ajout d'un export `cyclicDependencies` pour permettant de détecter un cycle de références dans les règles

**publicodes-react**

-   Meilleur affichage des données manquantes et règles associées dans la documentation
-   Legères retouches visuelles

## 1.0.0-beta.18

**core**

-   Export ESM sans dépendance à d'autres formats de module (UMD)

## 1.0.0-beta.17

**core**

-   Prise en compte des variables manquantes pour l'assiette des grilles et barèmes

**publicodes-react**

-   Changement cassant : Le composant `<Documentation />` n'est plus exporté
-   Nouveau composant exporté `<RulePage />` qui affiche une seule page
-   Possibilité de fournir des composants personnalisés pour l'affichage
-   Suppression de la dépendance à react-router et react-helmet
-   Suppression de dépendences utilitaires : ramda, classnames, react-easy-emoji
-   Corrige le style du remplacement dans les sommes
-   Corrige l'affichage des règles remplacées

## 1.0.0-beta.16

**core**

-   Répare un bug dans le mécanisme résoudre le cycle
-   Suppression des variables temporelles
-   Optimisation de la désactivation de branches
-   Meilleures performances

## 1.0.0-beta.15

**core**

-   Fix bug sur le mécanisme minimum, une valeur non applicable n'est plus considérée comme valant "0" (#1493)

## 1.0.0-beta.14

**publicodes-react**

-   Corrige un bug bloquant qui empêchait l'utilisation de la bibliothèque
-   Enlève la dépendance à i18n et react-i18n et toute la traduction qui n'était pas utilisée de toute façon
-   Ajoute des tests et une publication automatique des paquets publicodes

## 1.0.0-beta.13

**core**

-   Ajout d'un nouveau mécanisme : `résoudre la référence circulaire` (#1472)
-   Simplification de l'API de Engine (#1431)

**publicodes-react**

-   Améliore l'affichage des règles virtuelles dépliée dans une somme
-   Ajoute les meta dans les pages de règles (#1411)
