# Threat model

| Threat | Control |
| --- | --- |
| Authority changes product or evidence after consent | Owner accepts one canonical dossier digest; post-seal source mutation is rejected. |
| Mutable or redirected web evidence | Exact Git commit raw URL, repository origin, SHA-256, byte length, UTF-8 and unique citation checks. |
| Prompt injection in notices | Documents are explicitly untrusted data; output is a bounded schema and independently recomputed. |
| Model invents missing scope facts or remedy | Silence maps to `UNKNOWN`; identity, remedy-support and action-support relations all participate in consensus and deterministic routing. |
| Sources disagree | `contradiction=true` forces `MANUAL_REVIEW`. |
| Positive-state bypass | Only `assess_case` can produce a candidate route; only `finalize_case` closes an assessed case. |
| Replay/double settlement | Assessment and finalization are one-shot lifecycle transitions; there is no custody or payout. |
| Network/source failure | Transaction fails closed without state advancement; expiry can only finalize manual review. |
| Real-world overclaim | UI and docs label all fixtures synthetic and do not present legal, warranty, or safety advice. |
