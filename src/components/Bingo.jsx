import { useState } from 'react'
import { Link } from 'react-router-dom'

function Bingo() {
  // Initialize 5x5 grid with empty tiles
  const [tiles, setTiles] = useState(() => {
    return Array(5).fill(null).map(() => 
      Array(5).fill(null).map(() => ({
        content: '',
        completed: false
      }))
    )
  })

  const handleContentChange = (row, col, value) => {
    setTiles(prev => {
      const newTiles = [...prev]
      newTiles[row] = [...newTiles[row]]
      newTiles[row][col] = {
        ...newTiles[row][col],
        content: value
      }
      return newTiles
    })
  }

  const handleTileClick = (row, col) => {
    setTiles(prev => {
      const newTiles = [...prev]
      newTiles[row] = [...newTiles[row]]
      newTiles[row][col] = {
        ...newTiles[row][col],
        completed: !newTiles[row][col].completed
      }
      return newTiles
    })
  }

  return (
    <div className="min-h-screen bg-[#0a0e13] flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center text-white mb-8">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">2026 Bingo Card</h1>
          <Link
            to="/"
            className="inline-block bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors text-sm"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Bingo Grid */}
        <div className="grid grid-cols-5 gap-2 md:gap-4 mb-8">
          {tiles.map((row, rowIndex) =>
            row.map((tile, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="relative aspect-square bg-gray-800 border-2 border-gray-700 rounded-lg p-2 flex flex-col items-center justify-center transition-all hover:border-gray-500"
              >
                {/* Completion Overlay */}
                {tile.completed && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <div className="text-4xl md:text-6xl text-green-500 font-bold opacity-80">✓</div>
                  </div>
                )}

                {/* Editable Content */}
                <input
                  type="text"
                  value={tile.content}
                  onChange={(e) => {
                    if (!tile.completed) {
                      handleContentChange(rowIndex, colIndex, e.target.value)
                    }
                  }}
                  readOnly={tile.completed}
                  onClick={(e) => {
                    if (!tile.completed) {
                      e.target.focus()
                    }
                  }}
                  onFocus={(e) => {
                    if (!tile.completed) {
                      e.target.select()
                    } else {
                      e.target.blur()
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleTileClick(rowIndex, colIndex)
                  }}
                  className={`relative z-10 w-full h-full bg-transparent text-white text-center text-sm md:text-base font-semibold border-none outline-none resize-none ${
                    tile.completed 
                      ? 'line-through opacity-50 cursor-default' 
                      : 'cursor-text'
                  }`}
                  placeholder="..."
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
