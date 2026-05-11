# 15. Deployment topology

- Status: accepted
- Date: 2026-05-11

## Decision

The deployment topology is exactly **one node**: GitHub Pages.

- Source: `main` branch, `/docs` folder
- URL: https://baditaflorin.github.io/implemment-the-following-time-displaced-ears/
- TLS: GitHub-managed
- CDN: GitHub-managed (Fastly)
- Cost: zero
- On-call: none

No Docker, no nginx, no Compose. §10 and the runtime parts of §11 of the bootstrap meta-prompt are intentionally absent from this repo.

## Rollback

`git revert <commit>` followed by `git push`. Pages picks up the new HEAD within ~1 minute.
