"use client"

import * as React from "react"
import {
  Plus,
  Shield,
  X,
  LogIn,
  LogOut,
  AlertTriangle,
  Check,
  Eye,
  Tag,
  ListFilter,
  Info,
  Cloud,
  UserCircle2,
  Sparkles,
  History,
  Bookmark,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AuthForm } from "./components/auth-form"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { ActivityLog, type LogEntry } from "./components/activity-log"
import { SavedSpoilers } from "./components/saved-spoilers"

interface Topic {
  id: string
  name: string
  keywords: string[]
}

interface User {
  email: string
  token: string
}

interface LogStorage {
  logs: LogEntry[]
}

declare const chrome: any

export default function Popup() {
  const [isEnabled, setIsEnabled] = React.useState(true)
  const [newTopic, setNewTopic] = React.useState("")
  const [topics, setTopics] = React.useState<Topic[]>([])
  const [user, setUser] = React.useState<User | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isAuthOpen, setIsAuthOpen] = React.useState(false)
  const [showSaveSuccess, setShowSaveSuccess] = React.useState(false)
  const [logs, setLogs] = React.useState<LogEntry[]>([])

  // Helper function to safely access chrome storage
  const getChromeStorage = React.useCallback(async () => {
    if (typeof chrome === "undefined" || !chrome.storage?.sync) {
      console.warn("Chrome storage is not available")
      return { enabled: true, topics: [], authToken: null, userEmail: null, logs: [] }
    }

    return new Promise((resolve) => {
      chrome.storage.sync.get(["authToken", "userEmail", "enabled", "topics", "logs"], (result) => resolve(result))
    })
  }, [])

  // Helper function to safely set chrome storage
  const setChromeStorage = React.useCallback(async (data: Record<string, any>) => {
    if (typeof chrome === "undefined" || !chrome.storage?.sync) {
      console.warn("Chrome storage is not available")
      return
    }

    return new Promise((resolve) => {
      chrome.storage.sync.set(data, resolve)
    })
  }, [])

  // Load settings
  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await getChromeStorage()

        // Check for existing auth
        if (result.authToken && result.userEmail) {
          setUser({ email: result.userEmail, token: result.authToken })
          // If authenticated, fetch settings from backend
          fetchUserSettings(result.authToken)
        }

        // Load local settings regardless of auth status
        if (result.enabled !== undefined) setIsEnabled(result.enabled)
        if (result.topics) setTopics(result.topics)
        if (result.logs) setLogs(result.logs)
        setIsLoading(false)
      } catch (error) {
        console.error("Failed to load settings:", error)
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [getChromeStorage])

  const fetchUserSettings = async (token: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error("Failed to fetch settings")

      const data = await response.json()
      setTopics(data.topics || [])
      setIsEnabled(data.enabled !== undefined ? data.enabled : true)
    } catch (error) {
      console.error("Failed to fetch user settings:", error)
    }
  }

  const saveSettings = React.useCallback(async () => {
    if (!user?.token) return

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          enabled: isEnabled,
          topics,
        }),
      })
    } catch (error) {
      console.error("Failed to save settings:", error)
    }
  }, [isEnabled, topics, user?.token])

  // Save settings whenever they change
  React.useEffect(() => {
    const updateSettings = async () => {
      try {
        // Always save to chrome storage
        await setChromeStorage({ enabled: isEnabled, topics })

        // Notify content script of changes
        if (typeof chrome !== "undefined" && chrome.tabs) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
              chrome.tabs.sendMessage(tabs[0].id, {
                type: "UPDATE_SETTINGS",
                settings: { enabled: isEnabled, topics },
              })
            }
          })
        }

        // Only save to backend if authenticated
        if (user) {
          await saveSettings()
        }
      } catch (error) {
        console.error("Failed to update settings:", error)
      }
    }

    updateSettings()
  }, [isEnabled, topics, user, saveSettings, setChromeStorage])

  const handleAuthSuccess = async (userData: User) => {
    setUser(userData)
    await setChromeStorage({
      authToken: userData.token,
      userEmail: userData.email,
    })
    fetchUserSettings(userData.token)
    setIsAuthOpen(false)
  }

  const handleLogout = async () => {
    setUser(null)
    if (typeof chrome !== "undefined" && chrome.storage?.sync) {
      chrome.storage.sync.remove(["authToken", "userEmail"])
    }
  }

  const addLogEntry = React.useCallback(
    async (entry: Omit<LogEntry, "id" | "timestamp">) => {
      const newEntry: LogEntry = {
        ...entry,
        id: Date.now().toString(),
        timestamp: new Date(),
      }

      const updatedLogs = [newEntry, ...logs].slice(0, 50) // Keep last 50 entries
      setLogs(updatedLogs)

      if (typeof chrome !== "undefined" && chrome.storage?.sync) {
        chrome.storage.sync.set({ logs: updatedLogs })
      }
    },
    [logs],
  )

  const handleSwitchChange = (checked: boolean) => {
    setIsEnabled(checked)
    setShowSaveSuccess(true)
    setTimeout(() => setShowSaveSuccess(false), 2000)

    addLogEntry({
      type: checked ? "allow" : "block",
      content: `Spoiler blocking ${checked ? "enabled" : "disabled"}`,
    })
  }

  if (isLoading) {
    return (
      <Card className="w-[350px] shadow-none bg-gradient-to-br from-primary-50 to-secondary-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-bounce-in">Loading...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-[350px] shadow-none bg-gradient-to-br from-primary-50 to-secondary-50">
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-primary-700">
            <Shield className="h-6 w-6 text-primary-500 animate-[bounce-in_1s_ease-out] [animation-iteration-count:2]" />
            <span className="relative">
              Spoiler Blocker
              <span className="absolute -top-1 -right-4">
                <Sparkles className="h-4 w-4 text-accent-500 animate-pulse" />
              </span>
            </span>
          </CardTitle>
          {user ? (
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="hover:bg-primary-100">
              <LogOut className="h-4 w-4 text-primary-500" />
            </Button>
          ) : (
            <Sheet open={isAuthOpen} onOpenChange={setIsAuthOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" title="Login to sync" className="hover:bg-primary-100">
                  <LogIn className="h-4 w-4 text-primary-500" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Login to Sync</SheetTitle>
                  <SheetDescription>Sign in to sync your settings across devices</SheetDescription>
                </SheetHeader>
                <div className="mt-4">
                  <AuthForm onAuthSuccess={handleAuthSuccess} />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
        <CardDescription className="text-secondary-700 flex items-center gap-2">
          {user ? (
            <>
              <UserCircle2 className="h-4 w-4" />
              Logged in as {user.email}
            </>
          ) : (
            <>
              <Cloud className="h-4 w-4" />
              Settings saved locally
            </>
          )}
        </CardDescription>
        {showSaveSuccess && (
          <div className="absolute -top-2 right-0 animate-slide-in">
            <Badge variant="secondary" className="bg-secondary-500 text-white">
              <Check className="mr-1 h-3 w-3" /> Saved
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="settings" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-white/50 backdrop-blur-sm">
            <TabsTrigger value="settings" className="data-[state=active]:bg-primary-500 data-[state=active]:text-white">
              Settings
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-primary-500 data-[state=active]:text-white">
              Activity
            </TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:bg-primary-500 data-[state=active]:text-white">
              Saved
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4">
            <div className="flex items-center justify-between space-x-2 p-3 rounded-lg bg-white/50 backdrop-blur-sm">
              <Label htmlFor="blocker-active" className="font-medium text-primary-700 flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary-500" />
                Enable Spoiler Blocker
              </Label>
              <Switch
                id="blocker-active"
                checked={isEnabled}
                onCheckedChange={handleSwitchChange}
                className="data-[state=checked]:bg-primary-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-primary-700 flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary-500" />
                Add Topic to Block
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter show/movie name"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  className="bg-white/50 backdrop-blur-sm border-secondary-200 focus:border-secondary-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTopic.trim()) {
                      setTopics([
                        ...topics,
                        {
                          id: Date.now().toString(),
                          name: newTopic.trim(),
                          keywords: [newTopic.trim()],
                        },
                      ])
                      setNewTopic("")
                      setShowSaveSuccess(true)
                      setTimeout(() => setShowSaveSuccess(false), 2000)
                    }
                  }}
                />
                <Button
                  size="icon"
                  onClick={() => {
                    if (newTopic.trim()) {
                      setTopics([
                        ...topics,
                        {
                          id: Date.now().toString(),
                          name: newTopic.trim(),
                          keywords: [newTopic.trim()],
                        },
                      ])
                      setNewTopic("")
                      setShowSaveSuccess(true)
                      setTimeout(() => setShowSaveSuccess(false), 2000)
                    }
                  }}
                  className="bg-primary-500 hover:bg-primary-600"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-primary-700 flex items-center gap-2">
                <ListFilter className="h-4 w-4 text-primary-500" />
                Topics Being Blocked
              </Label>
              <ScrollArea className="h-[200px] rounded-lg border border-secondary-200 bg-white/50 backdrop-blur-sm">
                <div className="space-y-4 p-4">
                  {topics.map((topic) => (
                    <div key={topic.id} className="space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-primary-700">{topic.name}</h4>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 hover:bg-primary-100"
                          onClick={() => {
                            setTopics(topics.filter((t) => t.id !== topic.id))
                            setShowSaveSuccess(true)
                            setTimeout(() => setShowSaveSuccess(false), 2000)
                          }}
                        >
                          <X className="h-4 w-4 text-primary-500" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {topic.keywords.map((keyword) => (
                          <Badge
                            key={keyword}
                            variant="secondary"
                            className={cn(
                              "cursor-pointer bg-secondary-100 text-secondary-700 hover:bg-secondary-200",
                              "transition-all duration-200 ease-in-out",
                            )}
                            onClick={() => {
                              setTopics(
                                topics.map((t) =>
                                  t.id === topic.id
                                    ? {
                                        ...t,
                                        keywords: t.keywords.filter((k) => k !== keyword),
                                      }
                                    : t,
                                ),
                              )
                              setShowSaveSuccess(true)
                              setTimeout(() => setShowSaveSuccess(false), 2000)
                            }}
                          >
                            {keyword} <X className="ml-1 h-3 w-3" />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                  {topics.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                      <div className="relative">
                        <AlertTriangle className="h-8 w-8 text-accent-500 mb-2 animate-pulse" />
                        <Info className="h-4 w-4 text-primary-500 absolute -right-1 -bottom-1 animate-bounce" />
                      </div>
                      <p>No topics added yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <History className="h-4 w-4 text-primary-500" />
                <h3 className="font-medium text-primary-700">Recent Activity</h3>
              </div>
              <ActivityLog logs={logs} />
            </div>
          </TabsContent>

          <TabsContent value="saved">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Bookmark className="h-4 w-4 text-primary-500" />
                <h3 className="font-medium text-primary-700">Saved Spoilers</h3>
              </div>
              <SavedSpoilers topics={topics} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        <p className="text-xs text-secondary-700">Click on a keyword badge to remove it</p>
        {!user && <p className="text-xs text-secondary-700">Login to sync settings across devices</p>}
      </CardFooter>
    </Card>
  )
}

