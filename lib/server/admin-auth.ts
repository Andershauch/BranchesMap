import "server-only";

import { cookies } from "next/headers";

const ADMIN_COOKIE_NAME = "branches-map-admin";
const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 8;

function getAdminToken() {
  return process.env.ADMIN_ACCESS_TOKEN?.trim() || null;
}

export function isAdminConfigured() {
  return Boolean(getAdminToken());
}

export async function isAdminAuthenticated() {
  const token = getAdminToken();
  if (!token) {
    return false;
  }

  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE_NAME)?.value === token;
}

export async function requireAdminAuth() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    throw new Error("Admin authentication required.");
  }
}

export async function signInAsAdmin(candidate: string) {
  const token = getAdminToken();
  if (!token || candidate !== token) {
    return false;
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });

  return true;
}

export async function signOutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}