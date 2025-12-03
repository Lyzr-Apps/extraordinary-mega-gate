'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Upload, X, ChevronDown, FileText, Trash2, Copy, Loader } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import parseLLMJson from '@/utils/jsonParser'

interface Document {
  id: string
  name: string
  pages: number
  uploadDate: string
}

interface Source {
  citation_number: number
  document_name: string
  page_number: string
  relevant_excerpt: string
  relevance_score: number
}

interface SearchResult {
  answer: string
  sources: Source[]
  follow_up_suggestions: string[]
}

interface ConversationMessage {
  id: string
  query: string
  result: SearchResult
  timestamp: string
}

export default function HomePage() {
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: '1',
      name: 'Research Paper on AI.pdf',
      pages: 45,
      uploadDate: '2025-12-01'
    },
    {
      id: '2',
      name: 'Machine Learning Basics.pdf',
      pages: 32,
      uploadDate: '2025-11-28'
    }
  ])
  const [conversation, setConversation] = useState<ConversationMessage[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadZoneRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (uploadZoneRef.current) {
      uploadZoneRef.current.classList.add('border-purple-500', 'bg-purple-50', 'dark:bg-purple-950')
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    if (uploadZoneRef.current) {
      uploadZoneRef.current.classList.remove('border-purple-500', 'bg-purple-50', 'dark:bg-purple-950')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (uploadZoneRef.current) {
      uploadZoneRef.current.classList.remove('border-purple-500', 'bg-purple-50', 'dark:bg-purple-950')
    }
    handleFiles(e.dataTransfer.files)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = async (files: FileList) => {
    const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf')

    if (pdfFiles.length === 0) {
      return
    }

    setUploadingFiles(true)

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Add new documents
    const newDocs = pdfFiles.map((file, idx) => ({
      id: String(Date.now() + idx),
      name: file.name,
      pages: Math.floor(Math.random() * 40) + 5,
      uploadDate: new Date().toISOString().split('T')[0]
    }))

    setDocuments(prev => [...prev, ...newDocs])
    setUploadingFiles(false)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchQuery.trim() || documents.length === 0) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: searchQuery,
          agent_id: '69306aa076a9e921f94889f5',
          conversation_context: conversation.map(msg => ({
            query: msg.query,
            answer: msg.result.answer
          }))
        })
      })

      const data = await response.json()

      if (data.success) {
        const parsedResponse = typeof data.response === 'string'
          ? parseLLMJson(data.response, {})
          : data.response

        const searchResult: SearchResult = {
          answer: parsedResponse?.result?.answer ?? 'Unable to process response',
          sources: Array.isArray(parsedResponse?.result?.sources)
            ? parsedResponse.result.sources
            : [],
          follow_up_suggestions: Array.isArray(parsedResponse?.result?.follow_up_suggestions)
            ? parsedResponse.result.follow_up_suggestions
            : []
        }

        const newMessage: ConversationMessage = {
          id: String(Date.now()),
          query: searchQuery,
          result: searchResult,
          timestamp: new Date().toISOString()
        }

        setConversation(prev => [...prev, newMessage])
        setSearchQuery('')

        // Auto-scroll to results
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const clearConversation = () => {
    setConversation([])
  }

  const hasDocuments = documents.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-600">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-semibold">Knowledge Search</h1>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowSidebar(!showSidebar)}
            className="border-slate-600 hover:bg-slate-800"
          >
            Documents ({documents.length})
          </Button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-69px)]">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-8">
              {/* Search Bar - Always visible */}
              <div className="max-w-3xl mx-auto mb-12">
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-purple-400 rounded-lg opacity-20 group-focus-within:opacity-40 blur transition duration-300" />
                    <div className="relative flex items-center bg-slate-800 rounded-lg border border-slate-600 group-focus-within:border-purple-500 transition">
                      <Search className="w-5 h-5 ml-4 text-slate-400" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Ask anything about your documents..."
                        className="flex-1 bg-transparent border-0 focus:ring-0 text-white placeholder-slate-500 py-6"
                      />
                      <Button
                        type="submit"
                        disabled={loading || !hasDocuments}
                        className="mr-2 bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {loading ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          'Search'
                        )}
                      </Button>
                    </div>
                  </div>
                  {!hasDocuments && (
                    <p className="text-center text-sm text-slate-400">
                      Upload documents to get started
                    </p>
                  )}
                </form>
              </div>

              {/* Empty State */}
              {conversation.length === 0 && hasDocuments && (
                <div className="max-w-3xl mx-auto text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-purple-600/20 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">Start searching your knowledge base</h2>
                  <p className="text-slate-400">
                    Ask natural language questions about your uploaded documents to get accurate answers with source citations.
                  </p>
                </div>
              )}

              {/* Conversation Results */}
              <div className="max-w-3xl mx-auto space-y-8" ref={resultsRef}>
                {conversation.map((message, idx) => (
                  <div key={message.id} className="space-y-4">
                    {/* Query */}
                    <div className="flex justify-end">
                      <div className="max-w-xl bg-purple-600/20 border border-purple-500/30 rounded-lg px-4 py-3">
                        <p className="text-white">{message.query}</p>
                      </div>
                    </div>

                    {/* Answer */}
                    <div className="space-y-4">
                      <Card className="bg-slate-800 border-slate-700 p-6">
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="font-semibold text-white">Answer</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(message.result.answer)}
                            className="text-slate-400 hover:text-white"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-slate-100 leading-relaxed whitespace-pre-wrap">
                          {message.result.answer}
                        </div>
                      </Card>

                      {/* Sources */}
                      {message.result.sources.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-slate-300">Sources</h4>
                          <div className="grid gap-2">
                            {message.result.sources.map((source) => {
                              const sourceKey = `${message.id}-${source.citation_number}`
                              const isExpanded = expandedSourceId === sourceKey

                              return (
                                <div key={sourceKey}>
                                  <button
                                    onClick={() =>
                                      setExpandedSourceId(isExpanded ? null : sourceKey)
                                    }
                                    className="w-full text-left"
                                  >
                                    <Card className="bg-slate-700/50 border-slate-600 hover:bg-slate-700 transition p-4 cursor-pointer">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-2">
                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-semibold">
                                              {source.citation_number}
                                            </span>
                                            <span className="font-medium text-white">{source.document_name}</span>
                                            <span className="text-xs text-slate-400">{source.page_number}</span>
                                            <span className="text-xs text-slate-400">
                                              ({Math.round(source.relevance_score * 100)}% match)
                                            </span>
                                          </div>
                                          {!isExpanded && (
                                            <p className="text-sm text-slate-300 line-clamp-2">
                                              {source.relevant_excerpt}
                                            </p>
                                          )}
                                        </div>
                                        <ChevronDown
                                          className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ml-2 ${
                                            isExpanded ? 'rotate-180' : ''
                                          }`}
                                        />
                                      </div>
                                    </Card>
                                  </button>

                                  {/* Expanded Source */}
                                  {isExpanded && (
                                    <Card className="bg-slate-700/30 border-slate-600 p-4 mt-2">
                                      <p className="text-sm text-slate-200 leading-relaxed">
                                        {source.relevant_excerpt}
                                      </p>
                                    </Card>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Follow-up Suggestions */}
                      {message.result.follow_up_suggestions.length > 0 && (
                        <div className="space-y-3 mt-6 pt-6 border-t border-slate-700">
                          <h4 className="text-sm font-semibold text-slate-300">Suggested follow-ups</h4>
                          <div className="space-y-2">
                            {message.result.follow_up_suggestions.map((suggestion, sugIdx) => (
                              <button
                                key={sugIdx}
                                onClick={() => setSearchQuery(suggestion)}
                                className="w-full text-left px-3 py-2 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition text-sm text-slate-200 hover:text-white"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {idx < conversation.length - 1 && (
                      <Separator className="bg-slate-700/50 my-4" />
                    )}
                  </div>
                ))}
              </div>

              {/* Loading shimmer state */}
              {loading && (
                <div className="max-w-3xl mx-auto space-y-4">
                  <div className="flex justify-end">
                    <div className="max-w-xl bg-purple-600/20 border border-purple-500/30 rounded-lg px-4 py-3">
                      <p className="text-white">{searchQuery}</p>
                    </div>
                  </div>

                  <Card className="bg-slate-800 border-slate-700 p-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-slate-700 rounded animate-pulse w-3/4" />
                      <div className="h-4 bg-slate-700 rounded animate-pulse w-full" />
                      <div className="h-4 bg-slate-700 rounded animate-pulse w-5/6" />
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 right-0 w-96 bg-slate-800 border-l border-slate-700 transform transition-transform duration-300 z-50 flex flex-col ${
            showSidebar ? 'translate-x-0' : 'translate-x-full'
          } md:static md:translate-x-0`}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <h2 className="font-semibold text-lg">Documents</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(false)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Upload Zone */}
              <div
                ref={uploadZoneRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-600 rounded-lg p-6 cursor-pointer hover:border-purple-500 transition text-center bg-slate-700/20"
              >
                <Upload className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                <p className="text-sm font-medium text-white mb-1">
                  {uploadingFiles ? 'Processing...' : 'Drag PDFs here or click'}
                </p>
                <p className="text-xs text-slate-400">
                  {uploadingFiles ? 'Indexing documents...' : 'Supports PDF files'}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Document List */}
              {documents.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-300">
                      {documents.length} document{documents.length !== 1 ? 's' : ''}
                    </h3>
                    {conversation.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearConversation}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Clear history
                      </Button>
                    )}
                  </div>

                  {documents.map(doc => (
                    <Card
                      key={doc.id}
                      className="bg-slate-700/50 border-slate-600 p-4 group hover:bg-slate-700/70 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm truncate">
                            {doc.name}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {doc.pages} pages • {doc.uploadDate}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDocument(doc.id)}
                          className="opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Storage Summary */}
              {documents.length > 0 && (
                <Card className="bg-purple-600/10 border-purple-500/30 p-4">
                  <p className="text-xs text-slate-300 mb-2">Storage Summary</p>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">
                      {documents.length} document{documents.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm font-medium text-white">
                      {documents.reduce((sum, doc) => sum + doc.pages, 0)} total pages
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Mobile overlay */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}
    </div>
  )
}
