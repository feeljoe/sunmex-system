import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import Users from "@/models/User";
import { connectToDatabase } from "./db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("CREDENTIALS: ", credentials);
        if(!credentials?.username || !credentials?.password){
        console.log("Missing credentials");
        return null;
        }
        await connectToDatabase();
        
        const user = await Users.findOne({ username: credentials.username });
        console.log("USERNAME FOUND: ", user);
        
        if (!user) return null;
        
        const isValid = await verifyPassword(
        credentials.password,
        user.password!
        );
        console.log("RAW PASSWORD:", credentials.password);
        console.log("HASHED PASSWORD:", user.password);
        console.log(
        "BCRYPT TEST:",
        await verifyPassword("KNOWN_PASSWORD_HERE", user.password!)
        );
        console.log("PASSWORD VALID: ", isValid);
        if (!isValid) return null;
        
        return {
        id: user._id.toString(),
        name: `${user.firstName} ${user.lastName}`,
        username: user.username,
        role: user.userRole,
        };
        }             
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
  
    async session({ session, token }) {
      (session as any).userId = token.userId;
  
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
  
      return session;
    },
  
  },
  
  secret: process.env.NEXTAUTH_SECRET,
};


/**
 * Compare a plaintext password with a stored bcrypt hash.
 * Returns true if they match, false otherwise.
 */
export async function verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
  if (!plainPassword || !passwordHash) return false;
  try {
    return await bcrypt.compare(plainPassword, passwordHash);
  } catch (err) {
    // In case of any unexpected error, do not reveal details, just return false
    return false;
  }
}

/**
 * Helper to create a bcrypt hash from a plaintext password.
 * Not used by NextAuth directly but useful for seeding or user creation.
 */
export async function hashPassword(plainPassword: string, saltRounds = 10): Promise<string> {
  const salt = await bcrypt.genSalt(saltRounds);
  return bcrypt.hash(plainPassword, salt);
}
