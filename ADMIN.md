# ADMINISTRATIVE OPERATIONS GUIDE

The Aether Operations Console provides authorized staff with controls for user directories, badge review queues, abuse reports, branding, and audit histories.

## Accessing the Operations Console

Users with `super_admin`, `admin`, `moderator`, or `support` roles can access the console by clicking the **Shield Icon** in the bottom-left sidebar navigation or invoking `/api/admin/*` endpoints.

## 1. Dashboard Overview
Displays real-time platform statistics:
- Total registered profiles
- Active direct and group conversations
- Messages processed and non-E2EE search indexes
- Live WebSocket connections
- Pending verification applications
- Abuse reports requiring attention
- Media storage consumption (MB)

## 2. Verification Queue
Allows reviewers to evaluate identity documents:
- Review user profile and submitted entity name
- Inspect verification documents (ID, Incorporation, Press Credentials)
- **Approve**: Assigns official verified badge, category, and expiry duration (e.g., 365 days)
- **Reject**: Rejects application and specifies reasons delivered via automated email
- **Revoke**: Strips verified badge for policy infractions with audit notice

## 3. User Directory & RBAC
- Search users by name, username, or email
- Promote or demote user roles (`super_admin`, `admin`, `moderator`, `support`, `user`)
- Suspend or ban offending accounts with stated justification
- Terminate compromised user sessions

## 4. Moderation & Abuse Reports
Because this is a non-E2EE platform, authorized moderators can inspect reported message snippets:
- Review report categories (Spam, Harassment, Hate Speech, Impersonation, Illegal)
- Inspect evidence excerpts
- Issue official warnings, remove offending messages, or suspend accounts
- Record moderator notes with immutable audit logging

## 5. Security Audit Log Viewer
Searchable timeline of all platform events containing timestamp, actor, action, target resource, and IP address.
