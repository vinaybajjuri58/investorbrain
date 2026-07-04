import { handlers } from "@/auth";

// Expose the Auth.js GET + POST handlers at /api/auth/*
// (signin, signout, callback/google, session, csrf, etc.)
export const { GET, POST } = handlers;
