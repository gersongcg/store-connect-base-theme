# Tailwind Framework Constitution

## Core Goal

This project implements a thorough integration of the Tailwind CSS framework into the StoreConnect theme ecosystem. The objective is to completely remove the existing StoreConnect SCSS framework and replace it with Tailwind CSS.

The project demonstrates that StoreConnect templates and components can be progressively refactored and adapted to modern frontend technologies without being constrained by the existing styling architecture. The StoreConnect MCP can also use this as a source of truth for integrations and migrations.

The integration provides a foundation for adopting more modern design patterns, improving maintainability, and enabling a broader range of contemporary look and feel and user experience implementations across StoreConnect themes.

This migration implementation also includes a series of JS enhancements to improve the UI and UX of the StoreConnect base theme using Tailwind.

### Tech Stack

**Front-end:** Tailwind and Vite (to handle complex JS integration, resource and asset optimisation).

**Back-end:** Node modules and Python.

**Important:** The StoreConnect theme object doesn't handle the client's database. It only outputs data and can process different outcomes, calculations, or operations, but it doesn't write back, except for custom fields where we have write rights or through controllers where we can modify existing standard fields with security restrictions.

### Structure and Styles

Given that Tailwind is utility-first, we are fully adopting this approach.

In cases where customised CSS is needed, we can adopt SCSS to keep partials and CSS organised. Standard CSS declarations should be used alongside BEM styles.

### Migration

The following sequence should be used:

* Grab a template and remove all CSS classes related to that template.
* Analyse and replace the properties with Tailwind utility classes.
* Don't remove any IDs or data attributes.
* Remove the SCSS partial from the SCSS compilation. The goal is to keep reducing the StoreConnect SCSS until we have completed the entire migration.

### Dev Principles

* **Zero shadow code:** Don't add any code or features unless explicitly described in these specification documents.
* **Source of truth:** The first source of truth is the base theme for theme templates, and the SC toolkit for StoreConnect objects, Liquid filters, objects, forms, etc.

### Versioning

The current repository contains a set of changes and commits that establish the patterns of the project. The purpose was to provide proof of concepts before starting the real project.

From now on, we are creating a set of PRs that will allow us to submit a number of significant changes with related scopes. For example, we are migrating the Content Blocks CSS to Tailwind CSS. We can change all Content Blocks, but the PR must be scoped to Content Blocks only. This will make the history easier to track and make issues easier to identify and troubleshoot.
