# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest (`main`) | ✅ |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

To report a security issue, open a [GitHub Security Advisory](https://github.com/nik2208/ng-awesome-node-auth-prj/security/advisories/new) (private disclosure).

Please include:

- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept
- Affected versions
- Any suggested fix, if you have one

## Response timeline

- **Acknowledgement** within 48 hours
- **Assessment and triage** within 5 business days
- **Fix and advisory** published after a patch is ready

## Scope

This policy covers the code in this repository. 
For security issues related to the core logic, please check the [awesome-node-auth Security Policy](https://github.com/nik2208/awesome-node-auth/blob/main/SECURITY.md).

## Security best practices

- Never commit secrets (like `JWT_SECRET` or `ADMIN_SECRET`) to source control.
- Use the `.env.example` file as a template for your local environment.
- Always keep the `awesome-node-auth` dependency updated.
