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
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen && tile) {
      setContent(tile.content || '')
      // Focus input after modal opens
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }
  }, [isOpen, tile])

  if (!isOpen || !tile) return null

  const handleSave = () => {
    onSave(content)
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
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div 
        className="bg-gray-800 rounded-lg p-6 max-w-md w-full border-2 border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-white text-xl font-bold mb-4">Edit Tile Content</h2>
        
        <textarea
          ref={inputRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter tile content..."
          className="w-full bg-gray-700 text-white rounded-lg p-3 mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          autoFocus
        />
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
        
        <p className="text-gray-400 text-xs mt-3 text-center">
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
        fontSize: 'clamp(0.4rem, 1.5vw, 0.65rem)', // Responsive: min 6.4px, preferred 1.5vw, max 10.4px
        overflow: 'auto',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2px 4px',
        width: '100%',
        height: '100%',
        whiteSpace: 'normal',
        hyphens: 'auto',
        maxHeight: '100%',
        maxWidth: '100%',
        lineHeight: '1.15'
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
  const [showEditButton, setShowEditButton] = useState(null) // Track which tile shows edit button: {row, col}
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
      // Only save if we've finished loading and there might be unsaved changes in modal
      if (!isInitialLoadRef.current && modalTile) {
        // Save the tile that's currently being edited in modal
        saveBingoTile(CARD_ID, modalTile.row, modalTile.col, modalTile.content, modalTile.completed).catch(err => 
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
    
    // If edit button is already shown for this tile, open modal
    if (showEditButton?.row === row && showEditButton?.col === col) {
      const tile = tiles[row][col]
      setModalTile({
        row,
        col,
        content: tile.content,
        completed: tile.completed
      })
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
    const tile = tiles[row][col]
    setModalTile({
      row,
      col,
      content: tile.content,
      completed: tile.completed
    })
    setShowEditButton(null)
  }

  const handleModalSave = (newContent) => {
    if (!modalTile) return
    
    const { row, col, completed } = modalTile
    saveTile(row, col, newContent, completed)
    setModalTile(null)
  }

  const handleModalCancel = () => {
    setModalTile(null)
  }

  const handleTileDoubleClick = (row, col) => {
    // Don't toggle if modal is open for this tile
    if (modalTile && modalTile.row === row && modalTile.col === col) {
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
      
      // Close modal if open for this tile
      if (modalTile?.row === row && modalTile?.col === col) {
        setModalTile(null)
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
        <div className="grid grid-cols-5 gap-1.5 md:gap-4 mb-8">
          {tiles.map((row, rowIndex) =>
            row.map((tile, colIndex) => {
              const showEditBtn = showEditButton?.row === rowIndex && showEditButton?.col === colIndex
              
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => handleTileClick(rowIndex, colIndex)}
                  onDoubleClick={() => handleTileDoubleClick(rowIndex, colIndex)}
                  className={`bingo-tile relative aspect-square bg-gray-800 border-2 rounded-lg p-0.5 md:p-2 flex flex-col items-center justify-center transition-all overflow-hidden cursor-pointer ${
                    tile.completed
                      ? 'border-green-600'
                      : 'border-gray-700 hover:border-gray-500'
                  }`}
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
                    onDoubleClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleTileDoubleClick(rowIndex, colIndex)
                    }}
                  />
                  {/* Debug: Show tile content in corner for debugging */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="absolute top-0 left-0 text-[6px] text-gray-500 z-30 bg-black/50 px-1">
                      {tile.content ? `"${tile.content.substring(0, 10)}"` : 'empty'}
                    </div>
                  )}

                  {/* Edit Button (shown on click) */}
                  {!tile.completed && showEditBtn && (
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
        <div className="text-center text-gray-400 text-sm md:text-base">
          <p className="mb-2">👆 Click/tap a tile to show the edit button (✏️)</p>
          <p className="mb-2">✏️ Click the edit button to open the edit modal</p>
          <p className="mb-2">💡 Double click/tap a tile to toggle completion status</p>
          <p>🔒 Completed tiles cannot be edited - mark them incomplete first</p>
        </div>
      </div>
    </div>
  )
}

export default Bingo
