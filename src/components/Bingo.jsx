import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { 
  saveBingoTile, 
  loadBingoCard, 
  recordStatusChange 
} from '../services/bingoStorage'

// Component to handle contentEditable with proper cursor management
function TileContent({ content, completed, isEditing, onChange, onDoubleClick }) {
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
      className={`relative z-10 w-full h-full bg-transparent text-white text-center text-xs md:text-sm font-semibold border-none outline-none ${
        completed 
          ? 'line-through opacity-50 cursor-default' 
          : isEditing
          ? 'cursor-text'
          : 'cursor-default'
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
  const [editingTile, setEditingTile] = useState(null) // Track which tile is being edited: {row, col}
  const [editContent, setEditContent] = useState('') // Temporary content while editing
  const [showEditButton, setShowEditButton] = useState(null) // Track which tile shows edit button: {row, col}
  const isInitialLoadRef = useRef(true) // Track if we're still loading initial data

  // Load bingo card on mount
  useEffect(() => {
    loadCard()
  }, [])

  // Hide edit button when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      // If clicking outside a tile, hide the edit button
      if (showEditButton && !e.target.closest('.bingo-tile')) {
        setShowEditButton(null)
      }
    }

    if (showEditButton) {
      document.addEventListener('click', handleClickOutside)
      return () => {
        document.removeEventListener('click', handleClickOutside)
      }
    }
  }, [showEditButton])

  // Save on page unload to ensure nothing is lost (only if user made changes)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only save if we've finished loading and there might be unsaved changes
      if (!isInitialLoadRef.current && editingTile) {
        // Save the tile that's currently being edited
        const tile = tiles[editingTile.row][editingTile.col]
        saveBingoTile(CARD_ID, editingTile.row, editingTile.col, editContent || tile.content, tile.completed).catch(err => 
          console.error(`Failed to save tile ${editingTile.row}-${editingTile.col} on unload:`, err)
        )
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [tiles, editingTile, editContent])

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
      const result = await saveBingoTile(CARD_ID, row, col, content, completed)
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
        // Exit edit mode
        setEditingTile(null)
        setEditContent('')
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
    // If tile is completed, don't show edit button
    if (tiles[row][col].completed) {
      return
    }
    
    // If already editing this tile, do nothing
    if (editingTile?.row === row && editingTile?.col === col) {
      return
    }
    
    // If edit button is already shown for this tile, enter edit mode
    if (showEditButton?.row === row && showEditButton?.col === col) {
      setEditingTile({ row, col })
      setEditContent(tiles[row][col].content)
      setShowEditButton(null)
    } else {
      // Show edit button for this tile
      setShowEditButton({ row, col })
    }
  }

  const handleEditButtonClick = (row, col, e) => {
    e.stopPropagation()
    if (tiles[row][col].completed) {
      return // Don't allow editing completed tiles
    }
    setEditingTile({ row, col })
    setEditContent(tiles[row][col].content)
    setShowEditButton(null)
  }

  const handleSaveClick = (row, col, e) => {
    e.stopPropagation()
    const tile = tiles[row][col]
    saveTile(row, col, editContent, tile.completed)
  }

  const handleCancelEdit = (e) => {
    if (e) e.stopPropagation()
    setEditingTile(null)
    setEditContent('')
  }

  const handleContentChange = (row, col, value) => {
    // Only update the edit content, don't save yet
    setEditContent(value)
  }

  const handleTileDoubleClick = (row, col) => {
    // Don't toggle if we're editing this tile
    if (editingTile && editingTile.row === row && editingTile.col === col) {
      return
    }
    
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
      
      // Hide edit button if it was showing
      if (showEditButton?.row === row && showEditButton?.col === col) {
        setShowEditButton(null)
      }
      
      // Record status change
      if (oldStatus !== newStatus) {
        recordStatusChange(CARD_ID, row, col, oldStatus, newStatus).catch(err => 
          console.error('Failed to record status change:', err)
        )
      }
      
      // Save individual tile immediately when toggling completion
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
            row.map((tile, colIndex) => {
              const isEditing = editingTile?.row === rowIndex && editingTile?.col === colIndex
              const showEditBtn = showEditButton?.row === rowIndex && showEditButton?.col === colIndex
              const displayContent = isEditing ? editContent : tile.content
              
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => handleTileClick(rowIndex, colIndex)}
                  onDoubleClick={() => handleTileDoubleClick(rowIndex, colIndex)}
                  className={`bingo-tile relative aspect-square bg-gray-800 border-2 rounded-lg p-1 md:p-2 flex flex-col items-center justify-center transition-all overflow-hidden cursor-pointer ${
                    isEditing 
                      ? 'border-blue-500 border-4' 
                      : tile.completed
                      ? 'border-green-600'
                      : 'border-gray-700 hover:border-gray-500'
                  }`}
                >
                  {/* Completion Overlay */}
                  {tile.completed && !isEditing && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                      <div className="text-4xl md:text-6xl text-green-500 font-bold opacity-80">✓</div>
                    </div>
                  )}

                  {/* Tile Content */}
                  <TileContent
                    content={displayContent}
                    completed={tile.completed}
                    isEditing={isEditing}
                    onChange={(newContent) => handleContentChange(rowIndex, colIndex, newContent)}
                    onDoubleClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleTileDoubleClick(rowIndex, colIndex)
                    }}
                  />

                  {/* Edit Button (shown on click) */}
                  {!tile.completed && !isEditing && showEditBtn && (
                    <div className="absolute bottom-1 right-1 z-20">
                      <button
                        onClick={(e) => handleEditButtonClick(rowIndex, colIndex, e)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded transition-colors"
                        title="Edit tile"
                      >
                        ✏️
                      </button>
                    </div>
                  )}

                  {/* Save/Cancel Buttons (shown when editing) */}
                  {!tile.completed && isEditing && (
                    <div className="absolute bottom-1 right-1 flex gap-1 z-20">
                      <button
                        onClick={(e) => handleSaveClick(rowIndex, colIndex, e)}
                        disabled={saving}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-xs px-2 py-1 rounded transition-colors"
                        title="Save changes"
                      >
                        💾
                      </button>
                      <button
                        onClick={(e) => handleCancelEdit(e)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded transition-colors"
                        title="Cancel editing"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Instructions */}
        <div className="text-center text-gray-400 text-sm md:text-base">
          <p className="mb-2">👆 Click/tap a tile to show the edit button (✏️)</p>
          <p className="mb-2">✏️ Click the edit button to edit content, then save (💾)</p>
          <p className="mb-2">💡 Double click/tap a tile to toggle completion status</p>
          <p>🔒 Completed tiles cannot be edited - mark them incomplete first</p>
        </div>
      </div>
    </div>
  )
}

export default Bingo
