/**
 * The one message for "this needs the cloud, and this desk has none".
 *
 * It was written out by hand in eight places across four files, and it named
 * a remedy that does not exist: "Sign in (or set up sync in Settings)". A
 * cold-start tester followed it, found Settings has no sign-in of any kind —
 * because a desk built without cloud credentials HAS no sign-in anywhere —
 * and reasonably concluded the product was broken. Naming a remedy that is
 * not there costs the designer the hunt and then their trust in every other
 * instruction the app gives.
 *
 * A single export, because `clientFacingError` matches on this text to keep
 * it away from clients. Eight literals and a Map keyed on a ninth copy is
 * exactly the drift this codebase keeps paying for: change one and the
 * translation silently stops matching, and studio plumbing starts reaching
 * a stranger's phone.
 */
export const CLOUD_REQUIRED =
  'Client links need an account, and this desk is set up to work on its own. You can still export the brief or the pack and send it yourself.'
