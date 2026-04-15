import { b64urlDecode, b64urlEncode } from "@/lib/base64url";
import { importAuthHmacKey } from "@/lib/runtime-secret";

type VehicleShareTokenPayload = {
  type: "vehicle-share";
  vehicleId: string;
  exp: number;
};

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

export async function signVehicleShareToken(vehicleIdRaw: string, expiresInSec = 7 * 24 * 60 * 60): Promise<string> {
  const vehicleId = vehicleIdRaw.trim();
  const exp = Math.floor(Date.now() / 1000) + Math.max(60, Math.round(expiresInSec));
  const payload: VehicleShareTokenPayload = { type: "vehicle-share", vehicleId, exp };
  const encodedPayload = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await importAuthHmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedPayload));
  return `${encodedPayload}.${b64urlEncode(new Uint8Array(sig))}`;
}

export async function verifyVehicleShareToken(tokenRaw: string, vehicleIdRaw: string): Promise<boolean> {
  const token = tokenRaw.trim();
  const vehicleId = vehicleIdRaw.trim();
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !vehicleId) return false;
  const key = await importAuthHmacKey();
  const ok = await crypto.subtle.verify("HMAC", key, toArrayBuffer(b64urlDecode(sig)), new TextEncoder().encode(payload));
  if (!ok) return false;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(toArrayBuffer(b64urlDecode(payload)))) as Partial<VehicleShareTokenPayload>;
    if (parsed.type !== "vehicle-share") return false;
    if (!parsed.vehicleId || parsed.vehicleId !== vehicleId) return false;
    if (!parsed.exp || parsed.exp * 1000 < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}
