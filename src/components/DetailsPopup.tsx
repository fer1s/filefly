import { ReactNode } from 'react'
import { motion } from 'framer-motion'

import '../styles/components/DetailsPopup.scss'

interface DetailsPopupProps {
   visible: boolean
   title: string
   children: ReactNode
}

const DetailsPopup = ({ visible, title, children }: DetailsPopupProps) => {
   const popupVariants = {
      hidden: {
         opacity: 0,
         y: '100%',
         scale: 0.7,
      },
      visible: {
         opacity: 1,
         y: 0,
         scale: 1,
      },
   }

   return (
      <motion.div className="details_popup shadow" variants={popupVariants} initial="hidden" animate={visible ? 'visible' : 'hidden'} transition={{ duration: 0.1 }}>
         <div className="title">{title}</div>
         <div className="content">{children}</div>
      </motion.div>
   )
}

export default DetailsPopup
