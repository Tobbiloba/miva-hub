/**
 * Is this email domain a school's? Used when a student's university isn't on
 * Askly yet: school addresses can sign up and wait for their school to be
 * added; personal addresses (gmail, yahoo, ...) can't. Pure, no network.
 *
 * Schools use an education second-level domain in almost every country:
 * unilag.edu.ng, student.ui.edu.ng, ox.ac.uk, uct.ac.za, mit.edu, ...
 */

// Labels that mark an education namespace when they sit right before the
// country code (edu.ng, ac.uk, sch.ng) or are the top level (.edu)
const EDU_LABELS = new Set(["edu", "ac", "sch", "school", "univ"]);

const PERSONAL_PROVIDERS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "ymail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "zoho.com",
  "yandex.com",
  "mail.com",
]);

export function isSchoolDomain(domain: string | null | undefined): boolean {
  const d = (domain ?? "").trim().toLowerCase().replace(/\.$/, "");
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d)) return false;
  if (PERSONAL_PROVIDERS.has(d)) return false;
  const labels = d.split(".");
  const tld = labels[labels.length - 1];
  // US-style: anything.edu
  if (tld === "edu") return true;
  // Country style: <school>.<edu|ac|sch>.<cc>, needs a name before the edu label
  const second = labels[labels.length - 2];
  return labels.length >= 3 && tld.length === 2 && EDU_LABELS.has(second);
}
