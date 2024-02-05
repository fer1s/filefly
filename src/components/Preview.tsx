import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { convertFileSrc } from '@tauri-apps/api/tauri'

import { generateMarkdownPreview } from '../api'
import { ImageFormats, AudioFormats } from '../constants'

import AudioPreview from './AudioPreview'
import Spinner from './Spinner'

import '../styles/components/Preview.scss'

interface PreviewProps {
   fileType: string
   filePath: string

   previewVisible: boolean
   setPreviewVisible: (visible: boolean) => void
}

const previewBackdropVariants = {
   hidden: {
      opacity: 0,
      display: 'none',
   },
   visible: {
      opacity: 1,
      display: 'flex',
   },
}

const previewVariants = {
   hidden: {
      opacity: 0,
      scale: 0.6,
      y: '100%',
   },
   visible: {
      opacity: 1,
      scale: 1,
      y: 0,
   },
}

const Preview = ({ fileType, filePath, previewVisible, setPreviewVisible }: PreviewProps) => {
   const [isReady, setIsReady] = useState<boolean>(false)
   const [previewContent, setPreviewContent] = useState<string>('')

   useEffect(() => {
      if (!previewVisible) return

      if (fileType === 'md') {
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

   return (
      <>
         <motion.div
            variants={previewBackdropVariants}
            initial="hidden"
            animate={previewVisible ? 'visible' : 'hidden'}
            className="preview_backdrop"
            onClick={() => setPreviewVisible(false)}
         ></motion.div>
         {AudioFormats.includes(fileType) ? (
            <AudioPreview isVisible={previewVisible} filePath={filePath} />
         ) : (
            <motion.div
               variants={previewVariants}
               initial="hidden"
               animate={previewVisible ? 'visible' : 'hidden'}
               transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
               className={`preview_container shadow
               ${ImageFormats.includes(fileType) ? 'image' : ''}
               `}
            >
               <div className="preview_header">
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
            </motion.div>
         )}
      </>
   )
}

export default Preview
