import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { 
  saveBingoCard, 
  loadBingoCard, 
  recordStatusChange 
} from '../services/bingoStorage'

// Component to handle contentEditable with proper cursor management
function TileContent({ content, completed, onChange, onDoubleClick }) {
  const divRef = useRef(null)
  const isFocusedRef = useRef(false)

  useEffect(() => {
    if (divRef.current && !isFocusedRef.current) {
      divRef.current.textContent = content
    }
  }, [content])

  return (
    <div
      ref={divRef}
      contentEditable={!completed}
      suppressContentEditableWarning={true}
      onBlur={(e) => {
        isFocusedRef.current = false
        if (!completed) {
          onChange(e.target.textContent || '')
        }
      }}
      onFocus={() => {
        isFocusedRef.current = true
      }}
      onDoubleClick={onDoubleClick}
      className={`relative z-10 w-full h-full bg-transparent text-white text-center text-xs md:text-sm font-semibold border-none outline-none ${
        completed 
          ? 'line-through opacity-50 cursor-default' 
          : 'cursor-text'
      }`}
      style={{
        overflow: 'auto',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px',
        width: '100%',
        height: '100%',
        whiteSpace: 'normal',
        hyphens: 'auto',
        maxHeight: '100%',
        maxWidth: '100%'
      }}
      data-placeholder={content ? '' : '...'}
    />
  )
}

function Bingo() {
  // Card ID - using a fixed ID for now (could be user-specific later)
  const CARD_ID = 'sydplove-2026-bingo'
  
  // Initialize 5x5 grid with empty tiles
  const [tiles, setTiles] = useState(() => {
    return Array(5).fill(null).map(() => 
      Array(5).fill(null).map(() => ({
        content: '',
        completed: false
      }))
    )
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const saveTimeoutRef = useRef(null)

  // Load bingo card on mount
  useEffect(() => {
    loadCard()
  }, [])

  const loadCard = async () => {
    setLoading(true)
    try {
      const result = await loadBingoCard(CARD_ID)
      if (result.success && result.tiles) {
        setTiles(result.tiles)
      }
    } catch (error) {
      console.error('Failed to load bingo card:', error)
    } finally {
      setLoading(false)
    }
  }

  // Save bingo card (debounced)
  const saveCard = useCallback(async (tilesToSave) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout to debounce saves
    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        await saveBingoCard(CARD_ID, tilesToSave)
      } catch (error) {
        console.error('Failed to save bingo card:', error)
      } finally {
        setSaving(false)
      }
    }, 1000) // Save 1 second after last change
  }, [])

  const handleContentChange = (row, col, value) => {
    setTiles(prev => {
      const newTiles = [...prev]
      newTiles[row] = [...newTiles[row]]
      newTiles[row][col] = {
        ...newTiles[row][col],
        content: value
      }
      
      // Save card state (stores latest content)
      saveCard(newTiles)
      
      return newTiles
    })
  }

  const handleTileClick = (row, col) => {
    setTiles(prev => {
      const newTiles = [...prev]
      const oldStatus = newTiles[row][col].completed
      const newStatus = !oldStatus
      
      newTiles[row] = [...newTiles[row]]
      newTiles[row][col] = {
        ...newTiles[row][col],
        completed: newStatus
      }
      
      // Record status change
      if (oldStatus !== newStatus) {
        recordStatusChange(CARD_ID, row, col, oldStatus, newStatus).catch(err => 
          console.error('Failed to record status change:', err)
        )
      }
      
      // Save card state
      saveCard(newTiles)
      
      return newTiles
    })
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e13] flex items-center justify-center">
        <div className="text-white text-xl">Loading bingo card...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0e13] flex flex-col items-center py-8 px-4 relative">
      {/* Back to Home button - top left */}
      <Link
        to="/"
        className="absolute top-4 left-4 z-20 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-2 rounded-lg transition-colors text-lg"
        aria-label="Back to Home"
      >
        ←
      </Link>

      {/* Saving indicator */}
      {saving && (
        <div className="absolute top-4 right-4 z-20 bg-gray-800 text-white text-xs px-3 py-1 rounded-lg">
          Saving...
        </div>
      )}

      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center text-white mb-8">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">2026 Bingo Card</h1>
        </div>

        {/* Bingo Grid */}
        <div className="grid grid-cols-5 gap-2 md:gap-4 mb-8">
          {tiles.map((row, rowIndex) =>
            row.map((tile, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="relative aspect-square bg-gray-800 border-2 border-gray-700 rounded-lg p-1 md:p-2 flex flex-col items-center justify-center transition-all hover:border-gray-500 overflow-hidden"
              >
                {/* Completion Overlay */}
                {tile.completed && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <div className="text-4xl md:text-6xl text-green-500 font-bold opacity-80">✓</div>
                  </div>
                )}

                {/* Editable Content */}
                <TileContent
                  content={tile.content}
                  completed={tile.completed}
                  onChange={(newContent) => handleContentChange(rowIndex, colIndex, newContent)}
                  onDoubleClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleTileClick(rowIndex, colIndex)
                  }}
                />
              </div>
            ))
          )}
        </div>

        {/* Instructions */}
        <div className="text-center text-gray-400 text-sm md:text-base">
          <p className="mb-2">✏️ Single click on a tile to edit its content</p>
          <p className="mb-2">💡 Double click on a tile to toggle completion status</p>
          <p>🔒 Completed tiles cannot be edited - mark them incomplete first</p>
        </div>
      </div>
    </div>
  )
}

export default Bingo
