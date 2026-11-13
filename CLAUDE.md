# Portfolio Workflow Rules (HTML/CSS/JS & Cloudflare Pages)
# Engineering Protocols
- **Pre-Task Sync:** Always run `git pull` to sync with the remote repository before beginning any code modifications or creating new branches.
- **Never commit directly to `main`.
- ** Always create a descriptive feature branch (e.g., `fix/about-page-bullets`) before making edits.
- **No Build Step Required:** This is a static site (HTML/CSS/JS hosted on Cloudflare Pages). Do not run `npm run build`.
- **Local Testing:** If you need to test changes locally, spin up a lightweight preview server using Python or similar if requested.
- **Git & Push:** Once edits are complete and verified, commit with a clear message, push the feature branch to `origin`, and provide the GitHub PR creation link.

## Deploy and preview
 - Hosting: Cloudflare <Workers/Pages>, project `<name>` (see wrangler.jsonc).
 - Every push to a non-main branch builds a preview
 - Workflow: branch from main, commit, push, `gh pr create`, 
 - Finally:  `gh pr checks --watch` until the Cloudflare check finishes. Reply with the
   PR URL and the preview URL (from `gh pr view --comments`). Only merge after asking.
 - 
