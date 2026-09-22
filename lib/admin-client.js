"use client";

// Browser side of the ADMIN_TOKEN check in lib/admin-auth.js.
//
// THIS IS NOT A LOGIN SYSTEM. It is one shared password for one person (Jake).
// There are no accounts, no users, no roles and no sessions — anyone who knows
// the password can do everything the control panel can do. Don't build on this
// as if it were real auth; if the site ever needs more than one person, this
// gets replaced rather than extended.
//
// The token is kept in sessionStorage, so it is typed once per tab and is gone
// when the tab closes. Reads (GET) stay public and should use plain fetch.

const KEY = "admin-token";

function readToken() {
  try {
    return sessionStorage.getItem(KEY) || "";
  } catch {
    return ""; // private mode / storage disabled: just ask every time.
  }
}

function saveToken(token) {
  try {
    sessionStorage.setItem(KEY, token);
  } catch {
    /* not fatal — the token is still used for this request. */
  }
}

export function forgetToken() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to do. */
  }
}

// Returns the typed token, or "" if the prompt was cancelled.
function askForToken(message) {
  return (window.prompt(message) || "").trim();
}

// fetch() for writes: attaches the token, and if the server says 401 it asks
// again (once) and retries, so a wrong or stale password is fixable without a
// page reload. Throws a readable Error if there's still no working password;
// every caller already shows err.message.
export default async function adminFetch(url, options = {}) {
  let token = readToken();
  if (!token) {
    token = askForToken("Admin password (needed to make changes):");
    if (!token) throw new Error("Enter the admin password to make changes.");
    saveToken(token);
  }

  const send = (value) => {
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${value}`);
    return fetch(url, { ...options, headers });
  };

  let res = await send(token);
  if (res.status !== 401) return res;

  // Wrong password: drop it so the bad one isn't reused, and ask once more.
  forgetToken();
  const retry = askForToken("That password didn't work. Try again:");
  if (!retry) throw new Error("That password didn't work.");

  res = await send(retry);
  if (res.status === 401) {
    throw new Error("That password didn't work.");
  }
  saveToken(retry);
  return res;
}
