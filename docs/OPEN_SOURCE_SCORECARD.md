# Open Source Release Scorecard

This scorecard tracks readiness, not product popularity. A section marked complete means its release-preparation requirements are evidenced in the candidate.

| Stage | Status | Evidence / remaining work |
| --- | --- | --- |
| Problem | Complete | README and brand notes explain the subscription, repurchase, cloud-TTS and privacy problem Voca addresses |
| Project identity | Complete | Name, tagline, core statement, maintainer identity and product principles documented |
| Architecture | In progress | Core/local pipeline and provider boundaries documented; remaining hosted coupling still requires candidate review |
| Developer experience | In progress | Contributor quickstart and configuration docs exist; clean setup still needs independent execution |
| Security | In progress | Security policy, regression tests and candidate scanning added; credential rotation and clean history remain blocking |
| Testing | In progress | Existing security assertions plus CI type/build checks; broader representative flow verification remains |
| Documentation | Strong | README, architecture, roadmap, security, contributing, privacy, config, release and audit docs established |
| Community readiness | Strong | Conduct, governance, maintainer guidance, issue forms and PR template established |
| Automation | In progress | CI, dependency audit, Dependabot and candidate source checks defined; exact head must pass |
| Presentation | In progress | Identity and release narrative established; public screenshots/demo assets should be selected from copyright-safe material |
| Independent audit | First pass complete | `docs/OPEN_SOURCE_AUDIT.md`; final candidate audit still required |
| Release candidate | Blocked | Requires clean history, licensing, credential rotation and verification |
| Maintainer approval | Waiting | Only requested after audited RC exists |
| Public release | Waiting | Must follow explicit maintainer approval |

The scorecard deliberately does not convert unresolved blockers into percentages. Release-critical evidence is binary.