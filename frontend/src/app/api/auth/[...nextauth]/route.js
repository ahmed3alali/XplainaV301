import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        identifier: { label: "User ID or Email", type: "text", placeholder: "ID or Email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) return null;
        
        try {
          const res = await fetch("http://127.0.0.1:8000/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              identifier: credentials.identifier, 
              password: credentials.password 
            })
          })
          
          const data = await res.json()
          if (!res.ok) {
            throw new Error(data.detail || "Invalid login credentials.")
          }
          
          // data contains: access_token, user_type, user_id
          return { 
            id: data.user_id, 
            name: credentials.identifier, 
            userType: data.user_type,
            apiToken: data.access_token
          }
        } catch (error) {
          throw new Error(error.message)
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.userType = user.userType
        token.apiToken = user.apiToken
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.userType = token.userType
        session.user.apiToken = token.apiToken
      }
      return session
    }
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/login',
  }
})

export { handler as GET, handler as POST }
