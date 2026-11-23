import { consentOrNow, countFor, type ConsentToken } from "./consentPeriod";

let writes = 0;
let cosmeticWrites = 0;
let characters = 0;
let pinBackups = 0;
let pinsBackedUp = 0;
let pinBackupFailures = 0;
let pinBackupsBeside = 0;
let pinChoiceRepairs = 0;

export function noteSessionPinBackup(pins: number, consent?: ConsentToken | null, beside = false) {
  countFor(consentOrNow(consent), () => {
    pinBackups++;
    pinsBackedUp += pins;
    if (beside) pinBackupsBeside++;
  });
}

export function noteSessionPinBackupFailure(consent?: ConsentToken | null) {
  countFor(consentOrNow(consent), () => void pinBackupFailures++);
}

export const notePinChoicesRepaired = () => countFor(consentOrNow(undefined), () => void pinChoiceRepairs++);

export function noteSessionWrite(length: number, cosmeticOnly: boolean) {
  writes++;
  if (cosmeticOnly) cosmeticWrites++;
  characters += length;
}

export function takeSessionWrites() {
  const taken = { session_writes: writes, session_cosmetic_writes: cosmeticWrites, session_kb_written: Math.round(characters / 1024), session_pin_backups: pinBackups, session_pins_backed_up: pinsBackedUp, session_pin_backup_failures: pinBackupFailures, session_pin_backups_beside: pinBackupsBeside, session_pin_choice_repairs: pinChoiceRepairs };
  writes = 0;
  cosmeticWrites = 0;
  characters = 0;
  pinBackups = 0;
  pinsBackedUp = 0;
  pinBackupFailures = 0;
  pinBackupsBeside = 0;
  pinChoiceRepairs = 0;
  return taken;
}
