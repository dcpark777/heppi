import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { 
  saveBingoTile, 
  loadBingoCard, 
  recordStatusChange 
} from '../services/bingoStorage'

// Modal component for editing tile content
function EditTileModal({ isOpen, tile, onSave, onCancel }) {
  const [content, setContent] = useState('')
  const [completed, setCompleted] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen && tile) {
      setContent(tile.content || '')
      setCompleted(tile.completed || false)
      // Focus input after modal opens
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }
  }, [isOpen, tile])

  if (!isOpen || !tile) return null

  const handleSave = () => {
    onSave(content, completed)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      // Cmd/Ctrl + Enter to save
      handleSave()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 touch-none"
      onClick={onCancel}
      onTouchStart={(e) => {
        // Prevent body scroll when modal is open on mobile
        e.stopPropagation()
      }}
    >
      <div 
        className="bg-gray-800 rounded-lg p-4 md:p-6 max-w-md w-full border-2 border-gray-700 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <h2 className="text-white text-lg md:text-xl font-bold mb-4">Edit Tile</h2>
        
        <textarea
          ref={inputRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter tile content..."
          className="w-full bg-gray-700 text-white rounded-lg p-3 mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
          rows={5}
          autoFocus
          style={{
            fontSize: '16px', // Prevents zoom on iOS
            WebkitAppearance: 'none'
          }}
        />
        
        {/* Completion Toggle - Larger for mobile */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <label className="flex items-center gap-3 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={completed}
                onChange={(e) => setCompleted(e.target.checked)}
                className="w-6 h-6 md:w-5 md:h-5 rounded border-gray-600 bg-gray-700 text-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 cursor-pointer touch-manipulation"
                style={{
                  minWidth: '24px',
                  minHeight: '24px'
                }}
              />
              <span className="text-white font-medium text-base md:text-sm select-none">Completed</span>
            </label>
          </div>
          {/* Show completion date if tile is completed */}
          {completed && tile.completedAt && (
            <div className="text-gray-500 text-xs md:text-xs ml-9 md:ml-8">
              Completed on {new Date(tile.completedAt).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </div>
          )}
        </div>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            onTouchEnd={(e) => {
              e.preventDefault()
              onCancel()
            }}
            className="px-6 py-3 md:px-4 md:py-2 bg-gray-600 active:bg-gray-700 text-white rounded-lg transition-colors touch-manipulation text-base md:text-sm font-medium min-h-[44px] md:min-h-0"
            style={{
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            onTouchEnd={(e) => {
              e.preventDefault()
              handleSave()
            }}
            className="px-6 py-3 md:px-4 md:py-2 bg-green-600 active:bg-green-700 text-white rounded-lg transition-colors touch-manipulation text-base md:text-sm font-medium min-h-[44px] md:min-h-0"
            style={{
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            Save
          </button>
        </div>
        
        <p className="text-gray-400 text-xs mt-3 text-center hidden md:block">
          Press Cmd/Ctrl + Enter to save, Esc to cancel
        </p>
      </div>
    </div>
  )
}

// Component to handle contentEditable with proper cursor management
function TileContent({ content, completed, isEditing, onChange, onDoubleClick }) {
  const divRef = useRef(null)
  const isFocusedRef = useRef(false)
  const lastContentRef = useRef(content)

  // Initialize content on mount
  useEffect(() => {
    if (divRef.current && !divRef.current.textContent && content) {
      divRef.current.textContent = content
      lastContentRef.current = content
    }
  }, []) // Only run on mount

  useEffect(() => {
    // Only update if content changed externally and we're not focused
    if (divRef.current && !isFocusedRef.current) {
      const currentText = divRef.current.textContent || ''
      const newText = content || ''
      if (currentText !== newText) {
        console.log('TileContent updating:', { currentText, newText, isEditing, content })
        divRef.current.textContent = newText
        lastContentRef.current = newText
      }
    }
  }, [content, isEditing])

  const handleInput = (e) => {
    if (isEditing && !completed) {
      const newContent = e.target.textContent || ''
      // Update immediately on input
      onChange(newContent)
      lastContentRef.current = newContent
    }
  }

  const handleBlur = (e) => {
    isFocusedRef.current = false
  }

  return (
    <div
      ref={divRef}
      contentEditable={isEditing && !completed}
      suppressContentEditableWarning={true}
      onInput={handleInput}
      onBlur={handleBlur}
      onFocus={() => {
        isFocusedRef.current = true
      }}
      onDoubleClick={onDoubleClick}
      className={`relative z-10 w-full h-full bg-transparent text-white text-center font-semibold border-none outline-none ${
        completed 
          ? 'line-through opacity-50 cursor-default' 
          : isEditing
          ? 'cursor-text'
          : 'cursor-default'
      }`}
      style={{
        fontSize: 'clamp(0.5rem, 2.5vw, 0.7rem)', // Larger on mobile for readability
        overflow: 'auto',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 6px',
        width: '100%',
        height: '100%',
        whiteSpace: 'normal',
        hyphens: 'auto',
        maxHeight: '100%',
        maxWidth: '100%',
        lineHeight: '1.2',
        WebkitUserSelect: 'none',
        userSelect: 'none'
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
        completed: false,
        completedAt: null
      }))
    )
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [modalTile, setModalTile] = useState(null) // Track which tile is being edited in modal: {row, col, content, completed}
  const isInitialLoadRef = useRef(true) // Track if we're still loading initial data

  // Load bingo card on mount
  useEffect(() => {
    loadCard()
  }, [])

  // Debug: Log tiles whenever they change
  useEffect(() => {
    if (!loading) {
      console.log('🔄 Tiles state updated:', tiles)
      console.log('Sample tiles:', {
        '[0][0]': tiles[0]?.[0],
        '[0][1]': tiles[0]?.[1],
        '[1][0]': tiles[1]?.[0],
      })
    }
  }, [tiles, loading])


  // Save on page unload to ensure nothing is lost (only if user made changes)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only save if we've finished loading and there might be unsaved changes in modal
      if (!isInitialLoadRef.current && modalTile) {
        // Save the tile that's currently being edited in modal
        saveBingoTile(CARD_ID, modalTile.row, modalTile.col, modalTile.content, modalTile.completed, modalTile.completedAt).catch(err => 
          console.error(`Failed to save tile ${modalTile.row}-${modalTile.col} on unload:`, err)
        )
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [modalTile])

  const loadCard = async () => {
    setLoading(true)
    try {
      const result = await loadBingoCard(CARD_ID)
      console.log('Load result:', { success: result.success, hasTiles: !!result.tiles })
      
      if (result.success && result.tiles) {
        // Ensure tiles have the correct structure
        const loadedTiles = result.tiles
        console.log('Raw loaded tiles:', loadedTiles)
        console.log('Loaded tiles type:', typeof loadedTiles, 'isArray:', Array.isArray(loadedTiles))
        
        // Validate and set tiles
        if (Array.isArray(loadedTiles) && loadedTiles.length === 5) {
          // Validate each row is an array with 5 columns
          const isValid = loadedTiles.every(row => 
            Array.isArray(row) && row.length === 5 && 
            row.every(tile => tile && typeof tile === 'object' && 'content' in tile && 'completed' in tile)
          )
          
          if (isValid) {
            console.log('✅ Valid tile structure, setting tiles:', loadedTiles)
            console.log('Sample tile [0][0]:', loadedTiles[0]?.[0])
            setTiles(loadedTiles)
          } else {
            console.warn('⚠️ Invalid tile structure - rows/columns mismatch:', {
              length: loadedTiles.length,
              firstRowLength: loadedTiles[0]?.length,
              firstRow: loadedTiles[0],
              firstTile: loadedTiles[0]?.[0]
            })
            console.warn('Using default empty tiles')
          }
        } else {
          console.warn('⚠️ Invalid tile structure - not a 5x5 array:', {
            type: typeof loadedTiles,
            isArray: Array.isArray(loadedTiles),
            length: Array.isArray(loadedTiles) ? loadedTiles.length : 'N/A',
            loadedTiles
          })
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

  // Save a single tile - only saves when Save button is clicked
  const saveTile = useCallback(async (row, col, content, completed) => {
    // Don't save during initial load
    if (isInitialLoadRef.current) {
      console.log('⏸️ Skipping save - still loading initial data')
      return
    }

    setSaving(true)
    setSaveError(null)
      try {
        const result = await saveBingoTile(CARD_ID, row, col, content, completed, completedAt)
      if (!result.success) {
        setSaveError('Failed to save - check console for details')
        console.error('Save failed:', result)
      } else if (result.fallback) {
        setSaveError('Saved locally only - not synced to cloud')
      } else {
        console.log(`✅ Tile ${row}-${col} saved successfully`)
        // Update the tile in state with saved content
        setTiles(prev => {
          const newTiles = [...prev]
          newTiles[row] = [...newTiles[row]]
          newTiles[row][col] = {
            ...newTiles[row][col],
            content: content
          }
          return newTiles
        })
      }
    } catch (error) {
      console.error(`Failed to save tile ${row}-${col}:`, error)
      setSaveError('Save failed - check console')
    } finally {
      setSaving(false)
      // Clear error after 5 seconds
      setTimeout(() => setSaveError(null), 5000)
    }
  }, [])

  const handleTileClick = (row, col) => {
    // Open modal directly when tile is clicked
    const tile = tiles[row][col]
    setModalTile({
      row,
      col,
      content: tile.content,
      completed: tile.completed,
      completedAt: tile.completedAt || null
    })
  }

  const handleModalSave = (newContent, newCompleted) => {
    if (!modalTile) return
    
    const { row, col } = modalTile
    const oldCompleted = tiles[row][col].completed
    const oldCompletedAt = tiles[row][col].completedAt
    
    // Calculate completedAt: set when marking as completed, preserve if already completed, clear when uncompleted
    const now = new Date().toISOString()
    const newCompletedAt = newCompleted 
      ? (oldCompletedAt || now)
      : null
    
    // Update tile state
    setTiles(prev => {
      const newTiles = [...prev]
      newTiles[row] = [...newTiles[row]]
      newTiles[row][col] = {
        ...newTiles[row][col],
        content: newContent,
        completed: newCompleted,
        completedAt: newCompletedAt
      }
      return newTiles
    })
    
    // Record status change if completion status changed
    if (oldCompleted !== newCompleted) {
      recordStatusChange(CARD_ID, row, col, oldCompleted, newCompleted).catch(err => 
        console.error('Failed to record status change:', err)
      )
    }
    
    // Save to DynamoDB - use the calculated completedAt
    saveTile(row, col, newContent, newCompleted, newCompletedAt)
    setModalTile(null)
  }

  const handleModalCancel = () => {
    setModalTile(null)
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
        className="absolute top-4 left-4 z-20 bg-gray-600 active:bg-gray-700 text-white font-semibold py-3 px-3 md:py-2 md:px-2 rounded-lg transition-colors text-xl md:text-lg touch-manipulation min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
        aria-label="Back to Home"
        style={{
          WebkitTapHighlightColor: 'transparent'
        }}
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

      <div className="w-full max-w-4xl px-2 md:px-0">
        {/* Header */}
        <div className="text-center text-white mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl lg:text-6xl font-bold mb-2 md:mb-4">2026 Bingo Card</h1>
        </div>

        {/* Bingo Grid */}
        <div className="grid grid-cols-5 gap-2 md:gap-4 mb-8">
          {tiles.map((row, rowIndex) =>
            row.map((tile, colIndex) => {
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => handleTileClick(rowIndex, colIndex)}
                  onTouchEnd={(e) => {
                    e.preventDefault()
                    handleTileClick(rowIndex, colIndex)
                  }}
                  className={`bingo-tile relative aspect-square bg-gray-800 border-2 rounded-lg p-1 md:p-2 flex flex-col items-center justify-center transition-all overflow-hidden cursor-pointer touch-manipulation active:opacity-80 ${
                    tile.completed
                      ? 'border-green-600'
                      : 'border-gray-700 active:border-gray-500'
                  }`}
                  style={{
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                >
                  {/* Completion Overlay */}
                  {tile.completed && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                      <div className="text-4xl md:text-6xl text-green-500 font-bold opacity-80">✓</div>
                    </div>
                  )}

                  {/* Tile Content */}
                  <TileContent
                    content={tile.content}
                    completed={tile.completed}
                    isEditing={false}
                    onChange={() => {}}
                    onDoubleClick={() => {}}
                  />
                  {/* Debug: Show tile content in corner for debugging */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="absolute top-0 left-0 text-[6px] text-gray-500 z-30 bg-black/50 px-1">
                      {tile.content ? `"${tile.content.substring(0, 10)}"` : 'empty'}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Edit Modal */}
        <EditTileModal
          isOpen={!!modalTile}
          tile={modalTile}
          onSave={handleModalSave}
          onCancel={handleModalCancel}
        />

        {/* Instructions */}
        <div className="text-center text-gray-400 text-xs md:text-sm px-4">
          <p className="mb-2">👆 Tap a tile to open the edit modal</p>
          <p>✅ Use the checkbox in the modal to mark tiles as completed</p>
        </div>
      </div>
    </div>
  )
}

export default Bingo
