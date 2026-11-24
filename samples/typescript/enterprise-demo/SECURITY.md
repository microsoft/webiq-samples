# Security

The [repository security policy](../../../SECURITY.md) applies to this sample.
Do not report vulnerabilities or credentials through public issues.

Keep Web IQ, model, and Azure credentials on the server or in an approved secret
store. Protect live endpoints with an access code and centralized limits before
public use. In-memory demo quotas are not production security boundaries.
Rotate exposed credentials, clear browser storage on shared computers, and
never commit `.env` or local deployment parameters.
