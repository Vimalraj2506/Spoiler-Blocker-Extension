"use client"

import * as React from "react"
import { Shield, LogIn, Eye, Tag, ListFilter, AlertTriangle, Info, Plus, X, Check, Cloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { AuthForm } from "./auth-form"

interface Topic {
  id: string
  name: string
  keywords: string[]
}

// Declare chrome variable for environments where it might not be defined
declare global {
  interface Window {
    chrome?: any
  }
}

export default function Popup() {
  const [isEnabled, setIsEnabled] = React.useState(true)
  const [newTopic, setNewTopic] = React.useState("")
  const [topics, setTopics] = React.useState<Topic[]>([])
  const [isAuthOpen, setIsAuthOpen] = React.useState(false)
  const [showSaveSuccess, setShowSaveSuccess] = React.useState(false)

  // Load settings from chrome.storage
  React.useEffect(() => {
    if (typeof window !== "undefined" && window.chrome && window.chrome.storage?.sync) {
      window.chrome.storage.sync.get(["enabled", "topics"], (result) => {
        if (result.enabled !== undefined) setIsEnabled(result.enabled)
        if (result.topics) setTopics(result.topics)
      })
    }
  }, [])

  // Save settings to chrome.storage
  const saveSettings = React.useCallback(() => {
    if (typeof window !== "undefined" && window.chrome && window.chrome.storage?.sync) {
      window.chrome.storage.sync.set({ enabled: isEnabled, topics }, () => {
        setShowSaveSuccess(true)
        setTimeout(() => setShowSaveSuccess(false), 2000)
      })
    }
  }, [isEnabled, topics])

  return (
    <Card className="w-[350px] shadow-none bg-gradient-to-br from-primary-50 to-secondary-50">
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-primary-700">
            <Shield className="h-6 w-6 text-primary-500" />
            Spoiler Blocker
          </CardTitle>
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
                <AuthForm onAuthSuccess={() => setIsAuthOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <CardDescription className="text-secondary-700 flex items-center gap-2">
          <Cloud className="h-4 w-4" />
          Settings saved locally
        </CardDescription>
        {showSaveSuccess && (
          <div className="absolute -top-2 right-0 animate-slide-in">
            <Badge variant="secondary" className="bg-secondary-500 text-white">
              <Check className="mr-1 h-3 w-3" /> Saved
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between space-x-2 p-3 rounded-lg bg-white/50 backdrop-blur-sm">
          <Label htmlFor="blocker-active" className="font-medium text-primary-700 flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary-500" />
            Enable Spoiler Blocker
          </Label>
          <Switch
            id="blocker-active"
            checked={isEnabled}
            onCheckedChange={(checked) => {
              setIsEnabled(checked)
              saveSettings()
            }}
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
                  saveSettings()
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
                  saveSettings()
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
                        saveSettings()
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
                        className="bg-secondary-100 text-secondary-700 hover:bg-secondary-200 cursor-pointer"
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

        <p className="text-xs text-secondary-700 text-center">Login to sync your settings across devices</p>
      </CardContent>
    </Card>
  )
}

