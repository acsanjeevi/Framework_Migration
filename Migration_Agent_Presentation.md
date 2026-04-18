---
marp: true
theme: default
size: 16:9
---

# **AI-Powered Test Automation Migration**

### A Hackathon Project by [Your Team Name]

**Presenter:** [Your Name]

<!-- 
**Speaker Notes (15 seconds):**
"Hello everyone. Today, I'm excited to present our project: an AI-powered tool designed to modernize test automation frameworks."
-->

---

# **The Challenge: Legacy Test Suites**

- Manual migration is **slow, expensive, and error-prone**.
- Legacy frameworks lack modern features.
- Maintaining old code is a significant burden for QA teams.

![bg left:40%](https://i.imgur.com/gBv4V7d.png)

<!-- 
**Speaker Notes (30 seconds):**
"QA teams often struggle with outdated test automation suites. Manually migrating them to a modern framework like Playwright is a slow, costly, and difficult process. Our project tackles this problem head-on."
-->

---

# **Our Solution: The Migration Agentic Tool**

An intelligent web application that **automates the migration** of legacy test scripts to modern Playwright suites.

- **Target Users:** QA Engineers and Automation Teams.

<!-- 
**Speaker Notes (30 seconds):**
"We've built an AI-powered web tool that automates this entire process. It allows QA teams to simply upload their old test scripts and, in minutes, receive a fully migrated, modern Playwright test suite."
-->

---

# **Core Features**

1.  **AI-Powered Code Transformation**
    - Accurately converts legacy code to Playwright.
2.  **Self-Healing Selectors**
    - Automatically generates fallback locators to make tests more robust.
3.  **Automated CI/CD Pipeline Generation**
    - Creates ready-to-use files for Azure DevOps, GitLab, and Jenkins.
4.  **Real-Time Progress Dashboard**
    - A live web UI to track the migration status of every file.

<!-- 
**Speaker Notes (60 seconds):**
"Our tool has four core features. First, it uses AI to intelligently transform the code. Second, it builds self-healing capabilities directly into the migrated tests. Third, it automatically generates CI/CD pipeline files for immediate integration. Finally, it provides a real-time dashboard to monitor the entire process."
-->

---

# **Our Tech Stack**

- **Frontend:** React, TypeScript, Vite, Zustand, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **AI Models:** Anthropic Claude Haiku & Sonnet
- **Database / Queue:** Redis (for managing the migration job queue)
- **Key Libraries:** Multer, Bull, WebSockets

<!-- 
**Speaker Notes (45 seconds):**
"We built this with a modern, robust tech stack. The frontend is a React single-page application. The backend is powered by Node.js and Express. For the AI, we use a two-stage approach with Claude Haiku for speed and Claude Sonnet for accuracy. And we use Redis to manage the background processing of the migration jobs."
-->

---

# **Architecture Overview**

![bg right:55%](https://i.imgur.com/uV2S3jA.png)

**Data Flow:**
1.  **UI** sends files via **REST API**.
2.  **Backend** queues a job in **Redis**.
3.  **Orchestrator** begins a 7-step pipeline, using **AI Models**.
4.  **Backend** sends real-time progress via **WebSockets**.
5.  **UI** shows results when complete.

<!-- 
**Speaker Notes (2 minutes):**
"Let's walk through the architecture. It all starts at the frontend, where the user uploads their files. The React app sends the files to the backend via a REST API call. Our Node.js backend receives the request and places a new job into a Redis-powered queue. A background orchestrator picks up the job and begins a 7-step pipeline, using the Claude AI models. Throughout this process, the backend sends real-time progress updates to the frontend using WebSockets. Once complete, the user can view and download the fully migrated project. This design is scalable, resilient, and provides a great user experience."
-->

---

# **Live Demo Workflow**

1.  **Upload:** Drag and drop a ZIP file of legacy tests.
2.  **Configure:** Select the target CI/CD system.
3.  **Migrate:** Click the "Migrate" button.
4.  **Track:** Watch the live progress on the dashboard.
5.  **Review:**
    - View the migrated code.
    - See the `[SELF-HEAL]` annotations.
    - Check the generated CI/CD file.
6.  **Download:** Get the final ZIP package.

<!-- 
**Speaker Notes (30 seconds, before demo):**
"Now, I'll walk you through one clean, end-to-end workflow. We will upload a zip file of old tests, configure the migration, and watch the process live. Then we'll review the output, including the self-healing annotations and the generated CI/CD file, before downloading the final result."
-->

---

# **Thank You & Q&A**

- **Summary:** A powerful tool to automate and de-risk test framework migration.
- **Next Steps:** Further improve AI accuracy and expand framework support.

**Contact:** [Your Email / GitHub]

<!-- 
**Speaker Notes (20 seconds):**
"In summary, our tool significantly accelerates the migration of legacy test suites, saving time and improving the quality of the final code. Thank you for your time. I'm now ready for the demo and happy to answer any questions."
-->
