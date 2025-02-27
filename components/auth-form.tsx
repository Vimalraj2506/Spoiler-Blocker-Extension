"use client"

import * as React from "react"
import { UserPlus, LogIn, Mail, Lock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface AuthFormProps {
  onAuthSuccess: (user: { email: string; token: string }) => void
}

export function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const isSignUp = event.currentTarget.dataset.action === "signup"

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/${isSignUp ? "signup" : "login"}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed")
      }

      if (typeof window !== "undefined" && window.chrome && window.chrome.storage) {
        window.chrome.storage.sync.set({ authToken: data.token })
      }

      onAuthSuccess({ email, token: data.token })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Tabs defaultValue="login" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-secondary-100">
        <TabsTrigger
          value="login"
          className={cn("data-[state=active]:bg-secondary-500", "data-[state=active]:text-white")}
        >
          Login
        </TabsTrigger>
        <TabsTrigger
          value="signup"
          className={cn("data-[state=active]:bg-secondary-500", "data-[state=active]:text-white")}
        >
          Sign Up
        </TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <Card className="border-secondary-200">
          <CardHeader>
            <CardTitle className="text-primary-700">Welcome Back</CardTitle>
            <CardDescription>Sign in to sync your spoiler settings</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit} data-action="login">
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-login">Email</Label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    id="email-login"
                    type="email"
                    name="email"
                    placeholder="m@example.com"
                    required
                    className="border-secondary-200 focus:border-secondary-500 pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-login">Password</Label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    id="password-login"
                    type="password"
                    name="password"
                    required
                    className="border-secondary-200 focus:border-secondary-500 pl-10"
                  />
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-500 animate-fade-in flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-primary-500 hover:bg-primary-600" disabled={isLoading}>
                <LogIn className="mr-2 h-4 w-4" />
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>
      <TabsContent value="signup">
        <Card className="border-secondary-200">
          <CardHeader>
            <CardTitle className="text-primary-700">Create Account</CardTitle>
            <CardDescription>Sign up to sync your settings across devices</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit} data-action="signup">
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-signup">Email</Label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    id="email-signup"
                    type="email"
                    name="email"
                    placeholder="m@example.com"
                    required
                    className="border-secondary-200 focus:border-secondary-500 pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-signup">Password</Label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    id="password-signup"
                    type="password"
                    name="password"
                    required
                    className="border-secondary-200 focus:border-secondary-500 pl-10"
                  />
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-500 animate-fade-in flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-primary-500 hover:bg-primary-600" disabled={isLoading}>
                <UserPlus className="mr-2 h-4 w-4" />
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

