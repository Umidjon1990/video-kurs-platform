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
