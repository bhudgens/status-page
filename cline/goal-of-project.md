# GitHub-Powered Status Page

## Project Goal

The goal of this project is to create a **fully GitHub-driven status page** that leverages GitHub's existing features—such as **GitHub Issues, Actions, and Pages**—to power a company's system status monitoring.

## Key Features

- **GitHub Pages for Hosting:**  
  The status page is a static website hosted using **GitHub Pages**.
  
- **GitHub Issues for Incident Tracking:**  
  - Each issue represents a system incident.
  - Labels/tags define which system is affected.
  - Issue body follows a structured template for clear reporting.
  - Comments on the issue provide real-time updates.

- **GitHub Actions for Automation:**  
  - Detects when an issue is created or updated.
  - Updates a **JSON configuration file**.
  - Commits changes, triggering the status page update.

- **Configurable Multi-System Support:**  
  - A company can define multiple systems in a **config file**.
  - Each system has its own status representation.
  
- **Visual Representation of Status History:**  
  - A history bar (configurable: 30+ days) shows daily system health.
  - Green = No issues, Yellow = Minor issues, Red = Critical outages.
  - Clicking a past day reveals issue details.

## Workflow

1. **Fork the repository** to create a company-specific status page.
2. **Configure the repo** (e.g., define systems, set up a custom domain).
3. **Create an issue** to report an incident.
4. **GitHub Action updates the status page** automatically.
5. **Issue comments** act as real-time updates.
6. **Closing the issue** restores the page to an all-green state.

## Technology Choices

- **Static Site Generator:**  
  - Preferably a **Markdown-based** system.
  - Avoid **Jekyll** (GitHub's default), explore alternatives.
  - Potential options: **Hugo** or another lightweight static site generator.

- **Configuration Management:**  
  - JSON-based config file to store system definitions.
  - Issues and labels for system state tracking.

- **Security & Access Control:**  
  - Only admins or approved users can create and modify issues.
  - **Code Owners** or repo permissions to restrict changes.

## Final Deliverable

A GitHub repository template that companies can **fork** and **configure** in minutes to deploy their own **automated status page**.

