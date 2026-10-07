import { readFileSync } from 'node:fs';
import { X509Certificate } from 'node:crypto';

// Public trust anchor reviewed from the operator's Supabase Dashboard download.
// Changing it requires a reviewed PR, never a URL/Secret/environment override.
export const SUPABASE_CA_FINGERPRINT = '80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA';
export const SUPABASE_CA_FILE = new URL('../../supabase/certs/prod-ca-2021.crt', import.meta.url);

export function loadPinnedCA(path: string | URL = SUPABASE_CA_FILE): string {
  let pem: string;
  try { pem = readFileSync(path, 'utf8'); }
  catch { throw new Error('Pinned Supabase CA file missing or unreadable'); }
  // Require exactly one PEM certificate, without other trust anchors or keys.
  if (!/^-----BEGIN CERTIFICATE-----\r?\n[A-Za-z0-9+/=\r\n]+\r?\n-----END CERTIFICATE-----\s*$/.test(pem))
    throw new Error('Malformed pinned Supabase CA certificate');
  let cert: X509Certificate;
  try { cert = new X509Certificate(pem); }
  catch { throw new Error('Malformed pinned Supabase CA certificate'); }
  if (cert.fingerprint256 !== SUPABASE_CA_FINGERPRINT)
    throw new Error('Pinned Supabase CA fingerprint mismatch');
  if (!cert.ca || cert.subject !== cert.issuer || !cert.verify(cert.publicKey))
    throw new Error('Invalid pinned Supabase root CA');
  if (Date.now() < Date.parse(cert.validFrom) || Date.now() >= Date.parse(cert.validTo))
    throw new Error('Pinned Supabase CA outside validity period; reviewed rotation required');
  return pem;
}
