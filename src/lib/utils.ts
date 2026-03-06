import { randomUUID } from "crypto";

export function newId() {
  return randomUUID();
}

export function isoNow() {
  return new Date().toISOString();
}
