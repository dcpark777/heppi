import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { 
  saveBingoTile, 
  loadBingoCard, 
  recordStatusChange 
} from '../services/bingoStorage'

// Component to handle contentEditable with proper cursor management
function TileContent({ content, completed, onChange, onDoubleClick }) {
  const divRef = useRef(null)
  const isFocusedRef = useRef(false)
  const lastContentRef = useRef(content)

  useEffect(() => {
    // Only update if content changed externally and we're not focused
    if (divRef.current && !isFocusedRef.current && lastContentRef.current !== content) {
      divRef.current.textContent = content
      lastContentRef.current = content
    }
  }, [content])

  const handleInput = (e) => {
    if (!completed) {
      const newContent = e.target.textContent || ''
      // Update immediately on input
      onChange(newContent)
      lastContentRef.current = newContent
    }
  }

  const handleBlur = (e) => {
    isFocusedRef.current = false
    if (!completed) {
      const finalContent = e.target.textContent || ''
      // Ensure we save the final content
      if (finalContent !== lastContentRef.current) {
        onChange(finalContent)
        lastContentRef.current = finalContent
      }
    }
  }

  return (
    <div
      ref={divRef}
      contentEditable={!completed}
      suppressContentEditableWarning={true}
      onInput={handleInput}
      onBlur={handleBlur}
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
  const [saveError, setSaveError] = useState(null)
  const saveTimeoutRefs = useRef({}) // Track save timeouts per tile
  const isInitialLoadRef = useRef(true) // Track if we're still loading initial data

  // Load bingo card on mount
  useEffect(() => {
    loadCard()
  }, [])

  // Save on page unload to ensure nothing is lost (only if user made changes)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only save if we've finished loading and there might be unsaved changes
      if (!isInitialLoadRef.current) {
        // Save all pending tiles immediately
        tiles.forEach((row, rowIndex) => {
          row.forEach((tile, colIndex) => {
            const key = `${rowIndex}-${colIndex}`
            if (saveTimeoutRefs.current[key]) {
              clearTimeout(saveTimeoutRefs.current[key])
              delete saveTimeoutRefs.current[key]
            }
            // Save immediately
            saveBingoTile(CARD_ID, rowIndex, colIndex, tile.content, tile.completed).catch(err => 
              console.error(`Failed to save tile ${rowIndex}-${colIndex} on unload:`, err)
            )
          })
        })
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [tiles])

  const loadCard = async () => {
    setLoading(true)
    try {
      const result = await loadBingoCard(CARD_ID)
      console.log('Load result:', { success: result.success, hasTiles: !!result.tiles })
      
      if (result.success && result.tiles) {
        // Ensure tiles have the correct structure
        const loadedTiles = result.tiles
        // Validate and set tiles
        if (Array.isArray(loadedTiles) && loadedTiles.length === 5) {
          console.log('Loading tiles from storage:', loadedTiles)
          setTiles(loadedTiles)
        } else {
          console.warn('Invalid tile structure loaded:', loadedTiles)
          console.warn('Using default empty tiles')
        }
      } else if (result.success && !result.tiles) {
        console.log('No saved tiles found, using default empty tiles')
      } else {
        console.warn('Load failed or returned no data:', result)
      }
      
      // Log if we're using fallback
      if (result.fallback) {
        console.warn('⚠️ Using localStorage fallback - data not synced from DynamoDB')
      }
    } catch (error) {
      console.error('Failed to load bingo card:', error)
      // On error, keep the default empty tiles
    } finally {
      setLoading(false)
      // Mark that initial load is complete - now saves are allowed
      isInitialLoadRef.current = false
    }
  }

  // Save a single tile (debounced) - only saves if not initial load
  const saveTile = useCallback(async (row, col, content, completed) => {
    // Don't save during initial load
    if (isInitialLoadRef.current) {
      console.log('⏸️ Skipping save - still loading initial data')
      return
    }

    const key = `${row}-${col}`
    
    // Clear existing timeout for this tile
    if (saveTimeoutRefs.current[key]) {
      clearTimeout(saveTimeoutRefs.current[key])
    }

    // Set new timeout to debounce saves
    saveTimeoutRefs.current[key] = setTimeout(async () => {
      setSaving(true)
      setSaveError(null)
      try {
        const result = await saveBingoTile(CARD_ID, row, col, content, completed)
        if (!result.success) {
          setSaveError('Failed to save - check console for details')
          console.error('Save failed:', result)
        } else if (result.fallback) {
          setSaveError('Saved locally only - not synced to cloud')
        } else {
          console.log(`✅ Tile ${row}-${col} saved successfully`)
        }
      } catch (error) {
        console.error(`Failed to save tile ${row}-${col}:`, error)
        setSaveError('Save failed - check console')
      } finally {
        setSaving(false)
        delete saveTimeoutRefs.current[key]
        // Clear error after 5 seconds
        if (saveError) {
          setTimeout(() => setSaveError(null), 5000)
        }
      }
    }, 1000) // Save 1 second after last change
  }, [])

  const handleContentChange = (row, col, value) => {
    console.log('📝 Content changed:', { row, col, value })
    setTiles(prev => {
      const newTiles = [...prev]
      newTiles[row] = [...newTiles[row]]
      const updatedTile = {
        ...newTiles[row][col],
        content: value
      }
      newTiles[row][col] = updatedTile
      
      console.log('📝 New tile state:', updatedTile)
      
      // Save individual tile
      saveTile(row, col, updatedTile.content, updatedTile.completed)
      
      return newTiles
    })
  }

  const handleTileClick = (row, col) => {
    setTiles(prev => {
      const newTiles = [...prev]
      const oldStatus = newTiles[row][col].completed
      const newStatus = !oldStatus
      
      newTiles[row] = [...newTiles[row]]
      const updatedTile = {
        ...newTiles[row][col],
        completed: newStatus
      }
      newTiles[row][col] = updatedTile
      
      // Record status change
      if (oldStatus !== newStatus) {
        recordStatusChange(CARD_ID, row, col, oldStatus, newStatus).catch(err => 
          console.error('Failed to record status change:', err)
        )
      }
      
      // Save individual tile
      saveTile(row, col, updatedTile.content, updatedTile.completed)
      
      return newTiles
    })
  }


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
      
      {/* Save error indicator */}
      {saveError && (
        <div className="absolute top-4 right-4 z-20 bg-red-600 text-white text-xs px-3 py-1 rounded-lg max-w-xs">
          ⚠️ {saveError}
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
