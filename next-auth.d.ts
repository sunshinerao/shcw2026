import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      role: string;
      passCode: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    role: string;
    passCode: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    passCode?: string;
  }
}
