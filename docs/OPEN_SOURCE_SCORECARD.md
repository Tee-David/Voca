# Open Source Release Scorecard

This scorecard tracks readiness, not product popularity. A section marked complete means its release-preparation requirements are evidenced in the candidate.

| Stage | Status | Evidence / remaining work |
| --- | --- | --- |
| Problem | Complete | README and brand notes explain the subscription, repurchase, cloud-TTS and privacy problem Voca addresses |
| Project identity | Complete | Name, tagline, core statement, maintainer identity and product principles documented |
| Architecture | Strong, verification pending | Core/local pipeline, ADRs, data flow and provider contract documented; remaining hosted coupling requires candidate code review |
| Developer experience | Strong, verification pending | Quickstart, configuration, compatibility and dependency guidance exist; clean setup still needs independent execution |
| Security | Strong foundation, blocked | Policy, regression tests, checklist and candidate scan exist; credential rotation and clean history remain blocking |
| Testing | In progress | Existing security assertions plus CI type/build/backend checks; broader representative flow verification remains |
| Documentation | Complete foundation | Public-facing and contributor/release documentation set established and indexed |
| Community readiness | Complete foundation | Conduct, governance, maintainers, support, issue forms, PR template and CODEOWNERS established |
| Automation | Strong, verification pending | CI, dependency audit, Dependabot and tracked-source checks defined; exact candidate must pass |
| Polished presentation | Strong narrative, visuals pending | Landing page/release narrative and presentation checklist exist; safe visuals and public metadata remain candidate-stage work |
| Independent audit | Foundation audit complete | Audit and audit log exist; final clean-candidate audit still required |
| Release candidate | Blocked | Requires clean history, licensing, credential rotation and verification |
| Maintainer approval | Waiting | Requested only after audited RC exists |
| Public release | Waiting | Must follow explicit maintainer approval |

## Current boundary

The repository foundation pass is complete. Remaining work is release evidence: external credential rotation, exact third-party licensing provenance, creation and execution of a clean candidate, device/browser verification and the final candidate audit. These must be performed rather than inferred.

The scorecard deliberately does not convert unresolved blockers into percentages. Release-critical evidence is binary.