import { useEffect, useState } from 'react'
import { convertFileSrc } from '@tauri-apps/api/core'

import { generateMarkdownPreview } from '../api'
import { ImageFormats, AudioFormats } from '../constants'

import AudioPreview from './AudioPreview'
import Spinner from './Spinner'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'

import '../styles/components/Preview.css'

interface PreviewProps {
   fileType: string
   filePath: string

   previewVisible: boolean
   setPreviewVisible: (visible: boolean) => void

   onPrev: () => void
   onNext: () => void
   hasPrev: boolean
   hasNext: boolean
}

const Preview = ({ fileType, filePath, previewVisible, setPreviewVisible, onPrev, onNext, hasPrev, hasNext }: PreviewProps) => {
   const [isReady, setIsReady] = useState<boolean>(false)
   const [previewContent, setPreviewContent] = useState<string>('')

   useEffect(() => {
      if (!previewVisible) return

      if (fileType === 'md') {
         setIsReady(false)
         generateMarkdownPreview(filePath).then((data) => {
            setPreviewContent(data)
            setIsReady(true)
         })
      }

      if (ImageFormats.includes(fileType)) {
         setIsReady(true)
      }

      if (AudioFormats.includes(fileType)) {
         setIsReady(true)
      }
   }, [previewVisible, filePath])

   // Keyboard control while the preview is open: arrows navigate, Escape closes.
   useEffect(() => {
      if (!previewVisible) return

      const handleKeyDown = (e: KeyboardEvent) => {
         if (e.key === 'ArrowLeft') onPrev()
         else if (e.key === 'ArrowRight') onNext()
         else if (e.key === 'Escape') setPreviewVisible(false)
      }

      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
   }, [previewVisible, onPrev, onNext])

   return (
      <>
         <div
            className={`preview_backdrop${previewVisible ? ' visible' : ''}`}
            onClick={() => setPreviewVisible(false)}
         ></div>
         {AudioFormats.includes(fileType) ? (
            <AudioPreview isVisible={previewVisible} filePath={filePath} />
         ) : (
            <div
               className={`preview_container shadow${ImageFormats.includes(fileType) ? ' image' : ''}${previewVisible ? ' visible' : ''}`}
            >
               <div className="preview_header">
                  <div className="preview_nav">
                     <button className="nav_btn" onClick={onPrev} disabled={!hasPrev} aria-label="Previous">
                        <FontAwesomeIcon icon={faChevronLeft} />
                     </button>
                     <button className="nav_btn" onClick={onNext} disabled={!hasNext} aria-label="Next">
                        <FontAwesomeIcon icon={faChevronRight} />
                     </button>
                  </div>
                  <h4>Preview</h4>
                  <button onClick={() => setPreviewVisible(false)}>Close</button>
               </div>
               <div
                  className={`preview_content
                            ${isReady ? '' : 'loading'}
                            ${fileType === 'md' ? 'markdown' : ''}
                            ${ImageFormats.includes(fileType) ? 'image' : ''}
                            `}
               >
                  {isReady ? (
                     fileType === 'md' ? (
                        <div dangerouslySetInnerHTML={{ __html: previewContent }}></div>
                     ) : ImageFormats.includes(fileType) ? (
                        <img src={convertFileSrc(filePath)} alt={filePath} />
                     ) : (
                        <div className="preview_file_not_supported">
                           <h3>File type not supported</h3>
                        </div>
                     )
                  ) : (
                     <Spinner />
                  )}
               </div>
            </div>
         )}
      </>
   )
}

export default Preview
