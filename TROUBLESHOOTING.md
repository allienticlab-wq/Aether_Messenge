# TROUBLESHOOTING GUIDE

Common operational scenarios and resolutions:

## 1. WebSockets Reconnection Issues
- **Symptom**: Status bar indicates "Disconnected" or messages fail to deliver in real time.
- **Resolution**: Verify port 3000 is open and reverse proxies (Nginx/Caddy) are configured with `proxy_set_header Upgrade $http_upgrade;` and `proxy_set_header Connection "upgrade";`. Check browser developer tools Console for WS handshake errors.

## 2. WebRTC Audio/Video Traversal Behind Symmetric NAT
- **Symptom**: Calls connect but video freezes or audio does not flow.
- **Resolution**: Configure a TURN relay server in `.env` (`TURN_SERVER`, `TURN_USERNAME`, `TURN_PASSWORD`). In enterprise networks, symmetric firewalls block peer-to-peer UDP traffic without a TURN relay.

## 3. Microphone Permissions for Voice Notes
- **Symptom**: Voice message recorder triggers an immediate error or does not capture sound.
- **Resolution**: Ensure the browser has granted microphone access permissions. In iframe development environments, verify `requestFramePermissions` in `metadata.json` includes `microphone` and `camera`.

## 4. Email OTP Delivery
- **Symptom**: Verification emails are not received in development.
- **Resolution**: Inspect the built-in outbox viewer in the Admin Operations Console under **Email & SMS Center** (`/api/admin/outbox`). All generated OTP codes are logged with full previews.
