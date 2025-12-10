'use client'

import { useState, useEffect } from 'react'
import { Gamepad2, RotateCcw, Home, Loader, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

const GAME_MASTER_ID = '6939a7a6918f0918e0025f1e'

// Game types
type GameType = 'home' | 'tictactoe' | 'memory' | 'number'

// Tic Tac Toe Game
interface TicTacToeState {
  board: (string | null)[]
  isXNext: boolean
  winner: string | null
  draws: number
  wins: number
  losses: number
}

// Memory Game
interface MemoryCard {
  id: string
  value: string
  isFlipped: boolean
  isMatched: boolean
}

interface MemoryGameState {
  cards: MemoryCard[]
  selectedCards: string[]
  matchedPairs: number
  moves: number
  gameWon: boolean
  startTime: number
}

// Number Guessing Game
interface NumberGuessState {
  secretNumber: number
  guesses: number[]
  attemptsRemaining: number
  gameWon: boolean
  feedback: string
  played: number
  won: number
}

const cardValues = ['🌟', '🎮', '🎯', '🏆', '🎨', '🎭', '🎪', '🎲']

export default function GameHub() {
  const [currentGame, setCurrentGame] = useState<GameType>('home')
  const [totalScore, setTotalScore] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Tic Tac Toe state
  const [tttState, setTttState] = useState<TicTacToeState>({
    board: Array(9).fill(null),
    isXNext: true,
    winner: null,
    draws: 0,
    wins: 0,
    losses: 0
  })
  const [tttLoading, setTttLoading] = useState(false)

  // Memory Game state
  const [memoryState, setMemoryState] = useState<MemoryGameState>({
    cards: [],
    selectedCards: [],
    matchedPairs: 0,
    moves: 0,
    gameWon: false,
    startTime: 0
  })

  // Number Guessing state
  const [numberState, setNumberState] = useState<NumberGuessState>({
    secretNumber: Math.floor(Math.random() * 100) + 1,
    guesses: [],
    attemptsRemaining: 7,
    gameWon: false,
    feedback: '',
    played: 0,
    won: 0
  })
  const [numberInput, setNumberInput] = useState('')
  const [hintMessage, setHintMessage] = useState('')
  const [hintLoading, setHintLoading] = useState(false)

  // Initialize games
  useEffect(() => {
    if (currentGame === 'memory' && memoryState.cards.length === 0) {
      const shuffledCards = cardValues
        .flatMap(val => [val, val])
        .sort(() => Math.random() - 0.5)
        .map((val, idx) => ({
          id: String(idx),
          value: val,
          isFlipped: false,
          isMatched: false
        }))
      setMemoryState(prev => ({
        ...prev,
        cards: shuffledCards,
        startTime: Date.now()
      }))
    }
  }, [currentGame])

  // Play sound effect
  const playSound = (type: 'success' | 'error' | 'match') => {
    if (!soundEnabled) return
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    if (type === 'success') {
      oscillator.frequency.value = 800
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
    } else if (type === 'error') {
      oscillator.frequency.value = 300
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    } else if (type === 'match') {
      oscillator.frequency.value = 600
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.15)
    }
  }

  // Tic Tac Toe handlers
  const calculateWinner = (squares: (string | null)[]): string | null => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6]
    ]
    for (let line of lines) {
      const [a, b, c] = line
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a]
      }
    }
    return null
  }

  const handleTttClick = async (index: number) => {
    if (tttLoading || tttState.board[index] || tttState.winner) return

    const newBoard = [...tttState.board]
    newBoard[index] = 'X'

    const winner = calculateWinner(newBoard)
    if (winner === 'X') {
      playSound('success')
      setTttState(prev => ({
        ...prev,
        board: newBoard,
        winner: 'X',
        wins: prev.wins + 1
      }))
      setTotalScore(prev => prev + 10)
      return
    }

    if (newBoard.every(cell => cell !== null)) {
      playSound('match')
      setTttState(prev => ({
        ...prev,
        board: newBoard,
        draws: prev.draws + 1
      }))
      return
    }

    setTttState(prev => ({ ...prev, board: newBoard, isXNext: false }))
    setTttLoading(true)

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Current Tic-Tac-Toe board state: ${JSON.stringify(newBoard)}. Player (X) just moved to position ${index}. Calculate the optimal next move for AI (O). Return the move as {"move": [row, col]} where row and col are 0-2.`,
          agent_id: GAME_MASTER_ID
        })
      })

      const data = await response.json()

      if (data.success && data.response) {
        let moveData = data.response
        if (typeof data.response === 'string') {
          try {
            const jsonMatch = data.response.match(/\[?\s*(\d+)\s*,\s*(\d+)\s*\]?/)
            if (jsonMatch) {
              moveData = { move: [parseInt(jsonMatch[1]), parseInt(jsonMatch[2])] }
            }
          } catch (e) {
            console.error('Error parsing move:', e)
          }
        }

        if (moveData?.move && Array.isArray(moveData.move)) {
          const [row, col] = moveData.move
          const aiIndex = row * 3 + col

          if (newBoard[aiIndex] === null) {
            const aiBoard = [...newBoard]
            aiBoard[aiIndex] = 'O'

            const aiWinner = calculateWinner(aiBoard)
            if (aiWinner === 'O') {
              playSound('error')
              setTttState(prev => ({
                ...prev,
                board: aiBoard,
                winner: 'O',
                losses: prev.losses + 1
              }))
            } else if (aiBoard.every(cell => cell !== null)) {
              playSound('match')
              setTttState(prev => ({
                ...prev,
                board: aiBoard,
                draws: prev.draws + 1
              }))
            } else {
              playSound('success')
              setTttState(prev => ({
                ...prev,
                board: aiBoard,
                isXNext: true
              }))
            }
          }
        }
      }
    } catch (error) {
      console.error('Error getting AI move:', error)
    } finally {
      setTttLoading(false)
    }
  }

  const resetTttGame = () => {
    setTttState({
      board: Array(9).fill(null),
      isXNext: true,
      winner: null,
      draws: tttState.draws,
      wins: tttState.wins,
      losses: tttState.losses
    })
  }

  // Memory Game handlers
  const handleMemoryCardClick = (id: string) => {
    const card = memoryState.cards.find(c => c.id === id)
    if (!card || card.isFlipped || card.isMatched || memoryState.selectedCards.length >= 2) return

    const newCards = memoryState.cards.map(c =>
      c.id === id ? { ...c, isFlipped: true } : c
    )
    const newSelectedCards = [...memoryState.selectedCards, id]

    setMemoryState(prev => ({
      ...prev,
      cards: newCards,
      selectedCards: newSelectedCards
    }))

    if (newSelectedCards.length === 2) {
      const card1 = newCards.find(c => c.id === newSelectedCards[0])
      const card2 = newCards.find(c => c.id === newSelectedCards[1])

      if (card1 && card2 && card1.value === card2.value) {
        playSound('match')
        setTimeout(() => {
          setMemoryState(prev => {
            const updated = prev.cards.map(c =>
              c.id === newSelectedCards[0] || c.id === newSelectedCards[1]
                ? { ...c, isMatched: true }
                : c
            )
            const newMatched = prev.matchedPairs + 1
            const isWon = newMatched === 8

            if (isWon) {
              playSound('success')
            }

            return {
              ...updated,
              cards: updated,
              selectedCards: [],
              matchedPairs: newMatched,
              moves: prev.moves + 1,
              gameWon: isWon
            }
          })

          if (memoryState.matchedPairs + 1 === 8) {
            setTotalScore(prev => prev + 20)
          }
        }, 600)
      } else {
        playSound('error')
        setTimeout(() => {
          setMemoryState(prev => ({
            ...prev,
            cards: prev.cards.map(c => ({
              ...c,
              isFlipped: c.isMatched
            })),
            selectedCards: [],
            moves: prev.moves + 1
          }))
        }, 1000)
      }
    }
  }

  const resetMemoryGame = () => {
    const shuffledCards = cardValues
      .flatMap(val => [val, val])
      .sort(() => Math.random() - 0.5)
      .map((val, idx) => ({
        id: String(idx),
        value: val,
        isFlipped: false,
        isMatched: false
      }))
    setMemoryState({
      cards: shuffledCards,
      selectedCards: [],
      matchedPairs: 0,
      moves: 0,
      gameWon: false,
      startTime: Date.now()
    })
  }

  // Number Guessing handlers
  const handleNumberGuess = (e: React.FormEvent) => {
    e.preventDefault()
    const guess = parseInt(numberInput)

    if (isNaN(guess) || guess < 1 || guess > 100) {
      playSound('error')
      return
    }

    const newGuesses = [...numberState.guesses, guess]
    const newAttempts = numberState.attemptsRemaining - 1

    let feedback = ''
    let isWon = false

    if (guess === numberState.secretNumber) {
      feedback = 'Correct! You won!'
      isWon = true
      playSound('success')
      setTotalScore(prev => prev + 15)
    } else if (guess < numberState.secretNumber) {
      feedback = 'Too low! Try higher.'
      playSound('error')
    } else {
      feedback = 'Too high! Try lower.'
      playSound('error')
    }

    setNumberState(prev => ({
      ...prev,
      guesses: newGuesses,
      attemptsRemaining: newAttempts,
      gameWon: isWon,
      feedback: feedback,
      played: prev.played + 1,
      won: isWon ? prev.won + 1 : prev.won
    }))

    setNumberInput('')
    setHintMessage('')
  }

  const getNumberHint = async () => {
    if (numberState.gameWon || numberState.attemptsRemaining <= 0) return

    setHintLoading(true)

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `The secret number is between 1-100. Previous guesses: ${numberState.guesses.join(', ') || 'none yet'}. Give a strategic hint to help guess the secret number.`,
          agent_id: GAME_MASTER_ID
        })
      })

      const data = await response.json()

      if (data.success) {
        const hint = typeof data.response === 'string'
          ? data.response.substring(0, 200)
          : data.raw_response?.substring(0, 200) || 'Think strategically about the range!'

        setHintMessage(hint)
      }
    } catch (error) {
      console.error('Error getting hint:', error)
      setHintMessage('Try narrowing down the range!')
    } finally {
      setHintLoading(false)
    }
  }

  const resetNumberGame = () => {
    setNumberState({
      secretNumber: Math.floor(Math.random() * 100) + 1,
      guesses: [],
      attemptsRemaining: 7,
      gameWon: false,
      feedback: '',
      played: numberState.played,
      won: numberState.won
    })
    setNumberInput('')
    setHintMessage('')
  }

  // Home Screen
  if (currentGame === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-purple-700 bg-purple-900/80 backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-500">
                <Gamepad2 className="w-6 h-6 text-purple-900" />
              </div>
              <h1 className="text-2xl font-bold text-white">Game Hub</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-lg bg-purple-800 border border-purple-700">
                <span className="text-sm text-purple-200">Total Score:</span>
                <span className="ml-2 text-2xl font-bold text-cyan-400">{totalScore}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="border-purple-600 text-purple-100 hover:bg-purple-800"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-2">Choose Your Game</h2>
              <p className="text-purple-200">Pick a game and challenge yourself!</p>
            </div>

            {/* Game Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Tic Tac Toe Card */}
              <Card className="bg-gradient-to-br from-purple-800 to-purple-700 border-cyan-500/50 hover:border-cyan-400 transition-all hover:shadow-lg hover:shadow-cyan-500/25 cursor-pointer transform hover:scale-105"
                onClick={() => {
                  setCurrentGame('tictactoe')
                  resetTttGame()
                }}>
                <div className="p-8 text-center space-y-4">
                  <div className="text-6xl">⭕</div>
                  <h3 className="text-2xl font-bold text-white">Tic-Tac-Toe</h3>
                  <p className="text-purple-200 text-sm">Play against an AI opponent. Make your best moves to win!</p>
                  <div className="pt-4">
                    <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-purple-900 font-bold">
                      Play Now
                    </Button>
                  </div>
                  <div className="pt-2 space-y-1">
                    <p className="text-xs text-purple-300">
                      <span className="text-green-400 font-semibold">{tttState.wins}</span> wins
                    </p>
                  </div>
                </div>
              </Card>

              {/* Memory Match Card */}
              <Card className="bg-gradient-to-br from-purple-800 to-purple-700 border-magenta-500/50 hover:border-magenta-400 transition-all hover:shadow-lg hover:shadow-magenta-500/25 cursor-pointer transform hover:scale-105"
                onClick={() => {
                  setCurrentGame('memory')
                  resetMemoryGame()
                }}>
                <div className="p-8 text-center space-y-4">
                  <div className="text-6xl">🎴</div>
                  <h3 className="text-2xl font-bold text-white">Memory Match</h3>
                  <p className="text-purple-200 text-sm">Find matching pairs in this classic memory game. Fast reflexes win!</p>
                  <div className="pt-4">
                    <Button className="w-full bg-magenta-500 hover:bg-magenta-600 text-white font-bold">
                      Play Now
                    </Button>
                  </div>
                  <div className="pt-2 space-y-1">
                    <p className="text-xs text-purple-300">
                      Test your memory skills
                    </p>
                  </div>
                </div>
              </Card>

              {/* Number Guessing Card */}
              <Card className="bg-gradient-to-br from-purple-800 to-purple-700 border-lime-500/50 hover:border-lime-400 transition-all hover:shadow-lg hover:shadow-lime-500/25 cursor-pointer transform hover:scale-105"
                onClick={() => {
                  setCurrentGame('number')
                  resetNumberGame()
                }}>
                <div className="p-8 text-center space-y-4">
                  <div className="text-6xl">🎯</div>
                  <h3 className="text-2xl font-bold text-white">Number Guess</h3>
                  <p className="text-purple-200 text-sm">Guess the secret number between 1-100. Use hints wisely!</p>
                  <div className="pt-4">
                    <Button className="w-full bg-lime-500 hover:bg-lime-600 text-purple-900 font-bold">
                      Play Now
                    </Button>
                  </div>
                  <div className="pt-2 space-y-1">
                    <p className="text-xs text-purple-300">
                      <span className="text-green-400 font-semibold">{numberState.won}/{numberState.played}</span> wins
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Tic Tac Toe Game Screen
  if (currentGame === 'tictactoe') {
    const isBoardFull = tttState.board.every(cell => cell !== null)
    const gameOver = tttState.winner !== null || isBoardFull

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-purple-700 bg-purple-900/80 backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-500">
                <Gamepad2 className="w-6 h-6 text-purple-900" />
              </div>
              <h1 className="text-2xl font-bold text-white">Game Hub</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-lg bg-purple-800 border border-purple-700">
                <span className="text-sm text-purple-200">Total Score:</span>
                <span className="ml-2 text-2xl font-bold text-cyan-400">{totalScore}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Game Screen */}
        <div className="p-8">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold text-white text-center mb-2">Tic-Tac-Toe</h2>

            {/* Game Board */}
            <Card className="bg-gradient-to-br from-purple-800 to-purple-700 border-cyan-500 p-8 mb-8">
              <div className="grid grid-cols-3 gap-3 mb-8">
                {tttState.board.map((cell, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleTttClick(idx)}
                    disabled={tttLoading || gameOver || cell !== null}
                    className={`aspect-square text-5xl font-bold rounded-lg border-2 transition-all ${
                      cell === 'X'
                        ? 'bg-cyan-500 border-cyan-400 text-purple-900'
                        : cell === 'O'
                        ? 'bg-magenta-500 border-magenta-400 text-white'
                        : 'bg-purple-600 border-purple-500 hover:border-cyan-400 cursor-pointer'
                    }`}
                  >
                    {cell}
                  </button>
                ))}
              </div>

              {/* Status */}
              <div className="text-center mb-4 h-8">
                {gameOver ? (
                  tttState.winner === 'X' ? (
                    <p className="text-green-400 text-lg font-bold">You Won!</p>
                  ) : tttState.winner === 'O' ? (
                    <p className="text-red-400 text-lg font-bold">AI Won!</p>
                  ) : (
                    <p className="text-yellow-400 text-lg font-bold">Draw!</p>
                  )
                ) : (
                  <p className="text-purple-200">
                    {tttLoading ? 'AI is thinking...' : 'Your turn (X)'}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 text-center text-sm mb-6">
                <div className="bg-purple-700 rounded-lg p-3">
                  <p className="text-purple-300 text-xs">Wins</p>
                  <p className="text-green-400 text-2xl font-bold">{tttState.wins}</p>
                </div>
                <div className="bg-purple-700 rounded-lg p-3">
                  <p className="text-purple-300 text-xs">Draws</p>
                  <p className="text-yellow-400 text-2xl font-bold">{tttState.draws}</p>
                </div>
                <div className="bg-purple-700 rounded-lg p-3">
                  <p className="text-purple-300 text-xs">Losses</p>
                  <p className="text-red-400 text-2xl font-bold">{tttState.losses}</p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-3">
                <Button
                  onClick={resetTttGame}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-purple-900 font-bold"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  New Game
                </Button>
                <Button
                  onClick={() => {
                    setCurrentGame('home')
                    setTttLoading(false)
                  }}
                  variant="outline"
                  className="flex-1 border-cyan-500 text-cyan-400 hover:bg-purple-700"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Back Home
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Memory Game Screen
  if (currentGame === 'memory') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-purple-700 bg-purple-900/80 backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-500">
                <Gamepad2 className="w-6 h-6 text-purple-900" />
              </div>
              <h1 className="text-2xl font-bold text-white">Game Hub</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-lg bg-purple-800 border border-purple-700">
                <span className="text-sm text-purple-200">Total Score:</span>
                <span className="ml-2 text-2xl font-bold text-cyan-400">{totalScore}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Game Screen */}
        <div className="p-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold text-white text-center mb-2">Memory Match</h2>

            <Card className="bg-gradient-to-br from-purple-800 to-purple-700 border-magenta-500 p-8 mb-8">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 text-center text-sm mb-8">
                <div className="bg-purple-700 rounded-lg p-3">
                  <p className="text-purple-300 text-xs">Pairs Found</p>
                  <p className="text-magenta-400 text-2xl font-bold">{memoryState.matchedPairs}/8</p>
                </div>
                <div className="bg-purple-700 rounded-lg p-3">
                  <p className="text-purple-300 text-xs">Moves</p>
                  <p className="text-cyan-400 text-2xl font-bold">{memoryState.moves}</p>
                </div>
                <div className="bg-purple-700 rounded-lg p-3">
                  <p className="text-purple-300 text-xs">Time</p>
                  <p className="text-lime-400 text-2xl font-bold">{Math.floor((Date.now() - memoryState.startTime) / 1000)}s</p>
                </div>
              </div>

              {/* Card Grid */}
              <div className="grid grid-cols-4 gap-3 mb-8">
                {memoryState.cards.map(card => (
                  <button
                    key={card.id}
                    onClick={() => handleMemoryCardClick(card.id)}
                    disabled={memoryState.gameWon || memoryState.selectedCards.length >= 2 && !memoryState.selectedCards.includes(card.id)}
                    className={`aspect-square text-4xl rounded-lg border-2 font-bold transition-all ${
                      card.isMatched
                        ? 'bg-magenta-600 border-magenta-400 cursor-default'
                        : card.isFlipped
                        ? 'bg-purple-600 border-cyan-400'
                        : 'bg-purple-600 border-purple-500 hover:border-cyan-400 cursor-pointer hover:bg-purple-500'
                    }`}
                  >
                    {card.isFlipped || card.isMatched ? card.value : '?'}
                  </button>
                ))}
              </div>

              {/* Game Over Modal */}
              {memoryState.gameWon && (
                <Dialog open={memoryState.gameWon}>
                  <DialogContent className="bg-purple-800 border-magenta-500">
                    <DialogTitle className="text-white text-center">Congratulations!</DialogTitle>
                    <DialogDescription className="text-center space-y-3">
                      <p className="text-purple-200">You matched all pairs in {memoryState.moves} moves!</p>
                      <p className="text-magenta-400 text-lg font-bold">+20 points!</p>
                    </DialogDescription>
                  </DialogContent>
                </Dialog>
              )}

              {/* Controls */}
              <div className="flex gap-3">
                <Button
                  onClick={resetMemoryGame}
                  className="flex-1 bg-magenta-500 hover:bg-magenta-600 text-white font-bold"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  New Game
                </Button>
                <Button
                  onClick={() => setCurrentGame('home')}
                  variant="outline"
                  className="flex-1 border-magenta-500 text-magenta-400 hover:bg-purple-700"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Back Home
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Number Guessing Game Screen
  if (currentGame === 'number') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-purple-700 bg-purple-900/80 backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-500">
                <Gamepad2 className="w-6 h-6 text-purple-900" />
              </div>
              <h1 className="text-2xl font-bold text-white">Game Hub</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-lg bg-purple-800 border border-purple-700">
                <span className="text-sm text-purple-200">Total Score:</span>
                <span className="ml-2 text-2xl font-bold text-cyan-400">{totalScore}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Game Screen */}
        <div className="p-8">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold text-white text-center mb-2">Number Guessing</h2>

            <Card className="bg-gradient-to-br from-purple-800 to-purple-700 border-lime-500 p-8 mb-8">
              {/* Game Info */}
              <div className="grid grid-cols-2 gap-4 text-center text-sm mb-8">
                <div className="bg-purple-700 rounded-lg p-4">
                  <p className="text-purple-300 text-xs">Range</p>
                  <p className="text-lime-400 text-2xl font-bold">1 - 100</p>
                </div>
                <div className="bg-purple-700 rounded-lg p-4">
                  <p className="text-purple-300 text-xs">Attempts Left</p>
                  <p className={`text-2xl font-bold ${numberState.attemptsRemaining > 3 ? 'text-lime-400' : 'text-red-400'}`}>
                    {numberState.attemptsRemaining}
                  </p>
                </div>
              </div>

              {/* Input Area */}
              <form onSubmit={handleNumberGuess} className="mb-6 space-y-3">
                <div className="flex gap-3">
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={numberInput}
                    onChange={(e) => setNumberInput(e.target.value)}
                    placeholder="Enter a number..."
                    disabled={numberState.gameWon || numberState.attemptsRemaining <= 0}
                    className="flex-1 bg-purple-600 border-lime-500 text-white placeholder-purple-300 focus:border-lime-400"
                  />
                  <Button
                    type="submit"
                    disabled={numberState.gameWon || numberState.attemptsRemaining <= 0}
                    className="bg-lime-500 hover:bg-lime-600 text-purple-900 font-bold"
                  >
                    Guess
                  </Button>
                </div>

                {/* Feedback */}
                {numberState.feedback && (
                  <p className={`text-center font-semibold ${
                    numberState.feedback.includes('Correct')
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}>
                    {numberState.feedback}
                  </p>
                )}
              </form>

              {/* Hint Section */}
              <div className="mb-6">
                <Button
                  onClick={getNumberHint}
                  disabled={hintLoading || numberState.gameWon || numberState.attemptsRemaining <= 0}
                  variant="outline"
                  className="w-full border-lime-500 text-lime-400 hover:bg-purple-700 mb-3"
                >
                  {hintLoading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Getting hint...
                    </>
                  ) : (
                    'Get Hint'
                  )}
                </Button>
                {hintMessage && (
                  <Card className="bg-purple-700 border-lime-500/30 p-3">
                    <p className="text-sm text-lime-200">{hintMessage}</p>
                  </Card>
                )}
              </div>

              {/* Guess History */}
              {numberState.guesses.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-purple-200 mb-3">Guess History</h3>
                  <div className="space-y-2">
                    {numberState.guesses.map((guess, idx) => {
                      const direction = guess < numberState.secretNumber
                        ? '↑ Higher'
                        : guess > numberState.secretNumber
                        ? '↓ Lower'
                        : '✓ Correct'

                      return (
                        <div key={idx} className="flex items-center justify-between bg-purple-700 rounded-lg p-3">
                          <span className="text-white font-semibold">{guess}</span>
                          <span className={guess === numberState.secretNumber ? 'text-green-400 font-bold' : 'text-purple-300'}>
                            {direction}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Stats */}
              {(numberState.gameWon || numberState.attemptsRemaining === 0) && (
                <div className="grid grid-cols-2 gap-4 text-center text-sm mb-6">
                  <div className="bg-purple-700 rounded-lg p-3">
                    <p className="text-purple-300 text-xs">Games Played</p>
                    <p className="text-lime-400 text-2xl font-bold">{numberState.played}</p>
                  </div>
                  <div className="bg-purple-700 rounded-lg p-3">
                    <p className="text-purple-300 text-xs">Games Won</p>
                    <p className="text-lime-400 text-2xl font-bold">{numberState.won}</p>
                  </div>
                </div>
              )}

              {/* Game Over */}
              {numberState.attemptsRemaining === 0 && !numberState.gameWon && (
                <Dialog open={numberState.attemptsRemaining === 0 && !numberState.gameWon}>
                  <DialogContent className="bg-purple-800 border-lime-500">
                    <DialogTitle className="text-white text-center">Game Over</DialogTitle>
                    <DialogDescription className="text-center space-y-3">
                      <p className="text-purple-200">The secret number was {numberState.secretNumber}</p>
                      <p className="text-red-400 text-lg font-bold">Try again!</p>
                    </DialogDescription>
                  </DialogContent>
                </Dialog>
              )}

              {/* Controls */}
              <div className="flex gap-3">
                <Button
                  onClick={resetNumberGame}
                  className="flex-1 bg-lime-500 hover:bg-lime-600 text-purple-900 font-bold"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  New Game
                </Button>
                <Button
                  onClick={() => setCurrentGame('home')}
                  variant="outline"
                  className="flex-1 border-lime-500 text-lime-400 hover:bg-purple-700"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Back Home
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return null
}
