import type { User } from "@shared/schema";

export type SafeUser = Omit<User, "passwordHash">;

export type PublicInstructor = Pick<
  User,
  "id" | "firstName" | "lastName" | "profileImageUrl"
>;

export function toSafeUser(user: User): SafeUser {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export function toPublicInstructor(user: User): PublicInstructor {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImageUrl: user.profileImageUrl,
  };
}

/** Credential hashes are never part of an HTTP response, including joined legacy records. */
export function stripCredentialHashes(value:any):any{if(Array.isArray(value))return value.map(stripCredentialHashes);if(value&&typeof value==='object'&&!(value instanceof Date)&&!Buffer.isBuffer(value))return Object.fromEntries(Object.entries(value).filter(([key])=>key!=='passwordHash'&&key!=='password_hash').map(([key,v])=>[key,stripCredentialHashes(v)]));return value;}
