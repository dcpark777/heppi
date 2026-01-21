import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { 
  saveBingoTile, 
  loadBingoCard, 
  recordStatusChange,
  recordContentChange
} from '../services/bingoStorage'
import { uploadTileImage, deleteTileImage, deleteTileImageByUrl, getImageUrl } from '../services/s3Storage'
import UserIndicator from './UserIndicator'
import heic2any from 'heic2any'

/**
 * Compress an image to reduce file size
 * @param {Blob|File} imageBlob - The image blob to compress
 * @param {number} quality - JPEG quality (0-1)
 * @param {number} maxWidth - Maximum width in pixels
 * @returns {Promise<Blob>} Compressed image blob
 */
function compressImage(imageBlob, quality = 0.85, maxWidth = 1920) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(imageBlob)
    
    // Use requestIdleCallback to defer heavy work if possible
    const processImage = () => {
      // Calculate new dimensions
      let width = img.width
      let height = img.height
      
      // Only compress if image is significantly larger than maxWidth
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      } else {
        // If image is already small enough, just convert format without resizing
        URL.revokeObjectURL(url)
        // For small images, just return the original or minimal compression
        if (imageBlob.size < 1024 * 1024) { // Less than 1MB
          resolve(imageBlob)
          return
        }
      }
      
      // Create canvas and compress
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      
      // Use willReadFrequently hint for better performance
      const ctx = canvas.getContext('2d', { willReadFrequently: false })
      
      // Use imageSmoothingEnabled for better quality at lower sizes
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      
      // Draw image
      ctx.drawImage(img, 0, 0, width, height)
      
      // Convert to blob with compression - use setTimeout to yield to browser
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url)
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to compress image'))
          }
        },
        'image/jpeg',
        quality
      )
    }
    
    img.onload = () => {
      // Defer processing to avoid blocking
      if (window.requestIdleCallback) {
        requestIdleCallback(processImage, { timeout: 100 })
      } else {
        // Fallback: use setTimeout to yield to browser
        setTimeout(processImage, 0)
      }
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image for compression'))
    }
    
    img.src = url
  })
}

// Modal component for editing tile content
function EditTileModal({ isOpen, tile, onSave, onCancel }) {
  const [content, setContent] = useState('')
  const [completed, setCompleted] = useState(false)
  const [images, setImages] = useState([]) // Array of {url, preview} objects
  const [previewImageIndex, setPreviewImageIndex] = useState(0) // Index of image to use as preview
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (isOpen && tile) {
      setContent(tile.content || '')
      setCompleted(tile.completed || false)
      // Convert imageData to array format (support both old single image and new array format)
      const imageData = tile.imageData || tile.images || null
      if (imageData) {
        const imageArray = Array.isArray(imageData) ? imageData : [imageData]
        const filteredImages = imageArray.filter(Boolean)
        
        // Images are already stored with preview at index 0, so we can use them as-is
        // But we need to check if there's a stored previewImageIndex for backward compatibility
        const previewIndex = tile.previewImageIndex !== undefined ? tile.previewImageIndex : 0
        
        let orderedImages = filteredImages.map(url => ({ 
          url, 
          preview: getImageUrl(url) // Convert S3 URI/key to HTTPS URL for preview
        }))
        
        // If previewIndex is not 0, it means the data hasn't been saved with new format yet
        // In that case, we should show the correct preview but keep the original order
        // The preview will be reordered on save
        setImages(orderedImages)
        setPreviewImageIndex(previewIndex)
      } else {
        setImages([])
        setPreviewImageIndex(0)
      }
      // Focus input after modal opens
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }
  }, [isOpen, tile])

  if (!isOpen || !tile) return null

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Validate all files
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        alert('Please select only image files')
        return
      }
      // Increased limit to 50MB since images are stored in S3, not DynamoDB
      if (file.size > 50 * 1024 * 1024) {
        alert('Each image must be less than 50MB')
        return
      }
    }

    try {
      // Process all files (convert HEIC if needed, then read as data URL)
      const processedFiles = await Promise.all(
        files.map(async (file) => {
          // Check if file is HEIC format
          const isHEIC = file.type === 'image/heic' || 
                        file.type === 'image/heif' ||
                        file.name.toLowerCase().endsWith('.heic') ||
                        file.name.toLowerCase().endsWith('.heif')
          
          if (isHEIC) {
            try {
              // Convert HEIC to JPEG using heic2any
              const convertedBlobs = await heic2any({
                blob: file,
                toType: 'image/jpeg',
                quality: 0.85 // Slightly lower quality for faster conversion and smaller files
              })
              
              // heic2any returns an array, take the first result
              const jpegBlob = Array.isArray(convertedBlobs) ? convertedBlobs[0] : convertedBlobs
              
              // Compress the converted image further (only if it's large)
              let finalBlob = jpegBlob
              if (jpegBlob.size > 2 * 1024 * 1024) { // Only compress if > 2MB
                finalBlob = await compressImage(jpegBlob, 0.85, 1920) // Max width 1920px, 85% quality
              }
              
              // Create a new File object with JPEG type
              const jpegFile = new File([compressedBlob], file.name.replace(/\.heic?$/i, '.jpg'), {
                type: 'image/jpeg',
                lastModified: file.lastModified
              })
              
              return jpegFile
            } catch (conversionError) {
              console.error('Failed to convert HEIC image:', conversionError)
              alert('Failed to convert HEIC image. Please try converting it to JPEG first.')
              throw conversionError
            }
          }
          
          // Compress regular images too if they're large (only compress if > 3MB to avoid unnecessary processing)
          if (file.size > 3 * 1024 * 1024) { // Compress if larger than 3MB
            return compressImage(file, 0.85, 1920).then(compressedBlob => {
              return new File([compressedBlob], file.name, {
                type: file.type,
                lastModified: file.lastModified
              })
            })
          }
          
          return file
        })
      )

      // Read all processed files as data URLs
      const readers = processedFiles.map(file => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve({ url: reader.result, preview: reader.result })
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      })

      const newImages = await Promise.all(readers)
      setImages(prev => [...prev, ...newImages])
      
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Error processing images:', error)
      alert('Failed to process one or more image files')
    }
  }

  const handleRemoveImage = (indexToRemove) => {
    setImages(prev => {
      const newImages = prev.filter((_, index) => index !== indexToRemove)
      // Adjust preview index if needed
      if (indexToRemove === previewImageIndex) {
        // Removed the preview image, set to first image
        setPreviewImageIndex(newImages.length > 0 ? 0 : 0)
      } else if (indexToRemove < previewImageIndex) {
        // Removed an image before the preview, adjust index
        setPreviewImageIndex(previewImageIndex - 1)
      }
      return newImages
    })
  }

  const handleSetPreviewImage = (index) => {
    // Just mark which image should be preview (don't reorder until save)
    setPreviewImageIndex(index)
  }

  const handleSave = () => {
    // Extract URLs from images array (for new uploads, these will be base64; for existing, they'll be S3 URLs)
    let imageUrls = images.map(img => img.url)
    
    // Reorder images: move preview image to first position only when saving
    if (previewImageIndex > 0 && previewImageIndex < imageUrls.length) {
      const previewUrl = imageUrls[previewImageIndex]
      imageUrls.splice(previewImageIndex, 1)
      imageUrls.unshift(previewUrl)
    }
    
    onSave(content, completed, imageUrls, 0) // Always 0 since preview is moved to first position on save
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
        <h2 className="text-white text-lg md:text-xl font-bold mb-4">Tile Details</h2>
        
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
        
        {/* Image Upload Section */}
        <div className="mb-4">
          <label className="block text-white font-medium text-sm mb-2">Images (Optional)</label>
          
          {images.length > 0 && (
            <div className="mb-3 grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {images.map((image, index) => (
                <div key={index} className="relative">
                  <img 
                    src={image.preview} 
                    alt={`Preview ${index + 1}`} 
                    className={`w-full h-32 object-cover rounded-lg border-2 touch-manipulation ${
                      previewImageIndex === index 
                        ? 'border-blue-500 border-4' 
                        : 'border-gray-600'
                    }`}
                  />
                  {/* Set as preview button */}
                  <button
                    type="button"
                    onClick={() => handleSetPreviewImage(index)}
                    className={`absolute top-1 left-1 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold touch-manipulation ${
                      previewImageIndex === index
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    style={{
                      WebkitTapHighlightColor: 'transparent'
                    }}
                    title={previewImageIndex === index ? 'Preview image' : 'Set as preview'}
                  >
                    {previewImageIndex === index ? '★' : '☆'}
                  </button>
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold touch-manipulation"
                    style={{
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className="block w-full bg-gray-700 hover:bg-gray-600 text-white rounded-lg p-3 text-center cursor-pointer touch-manipulation transition-colors text-sm font-medium min-h-[44px] flex items-center justify-center"
            style={{
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            {images.length > 0 ? 'Add More Images' : 'Upload Images'}
          </label>
        </div>
        
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
          {/* Show completion date and user if tile is completed */}
          {completed && tile.completedAt && (
            <div className="text-gray-500 text-xs md:text-xs ml-9 md:ml-8">
              Completed on {new Date(tile.completedAt).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
              {tile.updatedBy && (
                <span className="ml-2">by {tile.updatedBy.charAt(0).toUpperCase() + tile.updatedBy.slice(1)}</span>
              )}
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
      </div>
    </div>
  )
}

// Component to display tile content
function TileContent({ content, completed, images, previewImageIndex = 0 }) {
  const divRef = useRef(null)
  
  // Support both old single image format and new array format
  const imageArray = images 
    ? (Array.isArray(images) ? images : [images]).filter(Boolean)
    : []

  useEffect(() => {
    if (divRef.current && imageArray.length === 0) {
      divRef.current.textContent = content || ''
    }
  }, [content, imageArray])

  // Get the preview image (only show one image)
  const previewImage = imageArray.length > 0 
    ? imageArray[previewImageIndex >= 0 && previewImageIndex < imageArray.length 
        ? previewImageIndex 
        : 0]
    : null

  if (previewImage) {
    return (
      <div
        className={`relative z-10 w-full h-full bg-transparent border-none outline-none ${
          completed ? 'opacity-50' : ''
        }`}
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden'
        }}
      >
        <img 
          src={getImageUrl(previewImage)} 
          alt={`${content || 'Tile'} preview`} 
          className="w-full h-full object-cover rounded"
          style={{
            maxWidth: '100%',
            maxHeight: '100%'
          }}
        />
        {content && (
          <div
            className="absolute bottom-0 left-0 right-0 text-white text-center font-semibold"
            style={{
              background: 'linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.7) 60%, transparent 100%)',
              padding: '0.5rem 0.25rem',
              fontSize: 'clamp(0.4rem, 1.2vw, 0.6rem)',
              lineHeight: '1.2',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'normal',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)'
            }}
          >
            {content}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={divRef}
      className={`relative z-10 w-full h-full bg-transparent text-white text-center font-semibold border-none outline-none ${
        completed ? 'opacity-50' : ''
      }`}
      style={{
        fontSize: 'clamp(0.4rem, 1.2vw, 0.6rem)',
        overflow: 'auto',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.5rem 0.25rem',
        width: '100%',
        height: '100%',
        whiteSpace: 'normal',
        hyphens: 'auto',
        maxHeight: '100%',
        maxWidth: '100%',
        lineHeight: '1.2',
        WebkitTapHighlightColor: 'transparent',
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
      }}
    />
  )
}

function Bingo() {
  // Card ID - using a fixed ID for now (could be user-specific later)
  const CARD_ID = 'sydplove-2026-bingo'
  
  // Get current username
  const getCurrentUsername = () => {
    return sessionStorage.getItem('sydplove_username') || 'unknown'
  }
  
  // Initialize 5x5 grid with empty tiles
  const [tiles, setTiles] = useState(() => {
    return Array(5).fill(null).map(() => 
      Array(5).fill(null).map(() => ({
        content: '',
        completed: false,
        completedAt: null,
        updatedBy: null,
        images: [], // Array of image URLs
        previewImageIndex: 0 // Index of image to show as preview
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



  // Save on page unload to ensure nothing is lost (only if user made changes)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only save if we've finished loading and there might be unsaved changes in modal
      if (!isInitialLoadRef.current && modalTile) {
        const username = getCurrentUsername()
        const images = modalTile.images || []
        saveBingoTile(CARD_ID, modalTile.row, modalTile.col, modalTile.content, modalTile.completed, modalTile.completedAt, username, images).catch(err => 
          console.error(`Failed to save tile on unload:`, err)
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
      
      if (result.success && result.tiles) {
        const loadedTiles = result.tiles
        
        // Validate and set tiles
        if (Array.isArray(loadedTiles) && loadedTiles.length === 5) {
          const isValid = loadedTiles.every(row => 
            Array.isArray(row) && row.length === 5 && 
            row.every(tile => tile && typeof tile === 'object' && 'content' in tile && 'completed' in tile)
          )
          
          if (isValid) {
            // Ensure all tiles have images array (support both old and new format)
            const normalizedTiles = loadedTiles.map(row => 
              row.map(tile => {
                const imageData = tile.images || tile.imageData || null
                const imagesArray = imageData ? (Array.isArray(imageData) ? imageData : [imageData]).filter(Boolean) : []
                return {
                  ...tile,
                  images: imagesArray,
                  previewImageIndex: tile.previewImageIndex !== undefined ? tile.previewImageIndex : 0
                }
              })
            )
            setTiles(normalizedTiles)
          } else {
            console.warn('Invalid tile structure - using default empty tiles')
          }
        } else {
          console.warn('Invalid tile structure - using default empty tiles')
        }
      }
      
      if (result.fallback) {
        console.warn('Using localStorage fallback - data not synced from DynamoDB')
      }
    } catch (error) {
      console.error('Failed to load bingo card:', error)
    } finally {
      setLoading(false)
      isInitialLoadRef.current = false
    }
  }

  // Save a single tile - only saves when Save button is clicked
  const saveTile = useCallback(async (row, col, content, completed, completedAt = null, imageUrls = null) => {
    if (isInitialLoadRef.current) {
      return
    }

    try {
      const username = getCurrentUsername()
      const result = await saveBingoTile(CARD_ID, row, col, content, completed, completedAt, username, imageUrls)
      if (!result.success) {
        setSaveError('Failed to save - check console for details')
        console.error('Save failed:', result)
        setTimeout(() => setSaveError(null), 5000)
      } else if (result.fallback) {
        setSaveError('Saved locally only - not synced to cloud')
        setTimeout(() => setSaveError(null), 5000)
      } else {
        // Update the tile in state with saved content
        setTiles(prev => {
          const newTiles = [...prev]
          newTiles[row] = [...newTiles[row]]
          const imagesArray = imageUrls ? (Array.isArray(imageUrls) ? imageUrls : [imageUrls]).filter(Boolean) : []
          newTiles[row][col] = {
            ...newTiles[row][col],
            content: content,
            images: imagesArray
          }
          return newTiles
        })
      }
    } catch (error) {
      console.error(`Failed to save tile ${row}-${col}:`, error)
      setSaveError('Save failed - check console')
      setTimeout(() => setSaveError(null), 5000)
    }
  }, [])

  const handleTileClick = (row, col) => {
    // Open modal directly when tile is clicked
    const tile = tiles[row][col]
    // Support both old single image format and new array format
    const imageData = tile.images || (tile.imageData ? [tile.imageData] : [])
    setModalTile({
      row,
      col,
      content: tile.content,
      completed: tile.completed,
      completedAt: tile.completedAt || null,
      updatedBy: tile.updatedBy || null,
      images: imageData,
      previewImageIndex: tile.previewImageIndex !== undefined ? tile.previewImageIndex : 0
    })
  }

  const handleModalSave = async (newContent, newCompleted, newImageUrls, previewImageIndex = 0) => {
    if (!modalTile) return
    
    const { row, col } = modalTile
    const oldContent = tiles[row][col].content
    const oldCompleted = tiles[row][col].completed
    const oldCompletedAt = tiles[row][col].completedAt
    const oldImages = tiles[row][col].images || (tiles[row][col].imageData ? [tiles[row][col].imageData] : [])
    const username = getCurrentUsername()
    
    setSaving(true)
    setSaveError(null)
    
    try {
      const newImageUrlsArray = Array.isArray(newImageUrls) ? newImageUrls : (newImageUrls ? [newImageUrls] : [])
      const finalImageUrls = []
      
      // Separate new uploads from existing images
      const imagesToUpload = []
      const existingImages = []
      
      newImageUrlsArray.forEach((imageUrl, index) => {
        if (imageUrl && imageUrl.startsWith('data:')) {
          imagesToUpload.push({ url: imageUrl, index })
        } else if (imageUrl) {
          existingImages.push({ url: imageUrl, index })
        }
      })
      
      // Upload all new images in parallel for faster processing
      if (imagesToUpload.length > 0) {
        const uploadPromises = imagesToUpload.map(({ url, index }) => 
          uploadTileImage(CARD_ID, row, col, url).then(result => ({ result, index }))
        )
        
        const uploadResults = await Promise.all(uploadPromises)
        
        // Check for failures
        const failedUpload = uploadResults.find(({ result }) => !result.success)
        if (failedUpload) {
          const failedIndex = uploadResults.indexOf(failedUpload)
          setSaveError('Failed to upload image ' + (failedIndex + 1) + ' - ' + (failedUpload.result.error || 'Unknown error'))
          setSaving(false)
          return
        }
        
        // Combine results in original order
        const allResults = [...uploadResults, ...existingImages.map(({ url, index }) => ({ result: { success: true, imageUrl: url }, index }))]
        allResults.sort((a, b) => a.index - b.index)
        allResults.forEach(({ result }) => {
          if (result.success && result.imageUrl) {
            finalImageUrls.push(result.imageUrl)
          }
        })
      } else {
        // No new uploads, just use existing images
        existingImages.forEach(({ url }) => finalImageUrls.push(url))
      }
      
      // Delete images that were removed (compare old vs new)
      const imagesToDelete = oldImages.filter(oldUrl => !finalImageUrls.includes(oldUrl))
      for (const imageUrlOrKey of imagesToDelete) {
        if (imageUrlOrKey) {
          // deleteTileImageByUrl handles both S3 keys and full URLs
          await deleteTileImageByUrl(CARD_ID, imageUrlOrKey)
        }
      }
      
      // Calculate completedAt: set when marking as completed, preserve if already completed, clear when uncompleted
      const now = new Date().toISOString()
      const newCompletedAt = newCompleted 
        ? (oldCompletedAt || now)
        : null
      
      // Track content change if content changed
      if (oldContent !== newContent) {
        recordContentChange(CARD_ID, row, col, oldContent, newContent, username).catch(err => 
          console.error('Failed to record content change:', err)
        )
      }
      
      // Track status change if completion status changed
      if (oldCompleted !== newCompleted) {
        recordStatusChange(CARD_ID, row, col, oldCompleted, newCompleted, username).catch(err => 
          console.error('Failed to record status change:', err)
        )
      }
      
      // Update tile state
      setTiles(prev => {
        const newTiles = [...prev]
        newTiles[row] = [...newTiles[row]]
        newTiles[row][col] = {
          ...newTiles[row][col],
          content: newContent,
          completed: newCompleted,
          completedAt: newCompletedAt,
          updatedBy: username, // Track who made the update
          images: finalImageUrls,
          previewImageIndex: previewImageIndex
        }
        return newTiles
      })
      
      // Save to DynamoDB - use the calculated completedAt and image URLs array
      await saveTile(row, col, newContent, newCompleted, newCompletedAt, finalImageUrls, previewImageIndex)
      setModalTile(null)
    } catch (error) {
      console.error('Error saving tile:', error)
      setSaveError('Failed to save - ' + error.message)
    } finally {
      setSaving(false)
    }
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

      {/* User indicator and status messages */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
        <UserIndicator onLogout={() => {
          sessionStorage.removeItem('sydplove_authenticated')
          sessionStorage.removeItem('sydplove_username')
          window.location.href = '/'
        }} />
        {saving && (
          <div className="bg-gray-800 text-white text-xs px-3 py-1 rounded-lg">
            Saving...
          </div>
        )}
        {saveError && (
          <div className="bg-red-600 text-white text-xs px-3 py-1 rounded-lg max-w-xs">
            ⚠️ {saveError}
          </div>
        )}
      </div>

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
                    images={tile.images || (tile.imageData ? [tile.imageData] : [])}
                    previewImageIndex={tile.previewImageIndex !== undefined ? tile.previewImageIndex : 0}
                  />
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
          <p>👆 Tap a tile to edit</p>
        </div>
      </div>
    </div>
  )
}

export default Bingo
