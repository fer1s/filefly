import { ToastType } from '../lib/toast'

import '../styles/components/Toast.css'

export type ToastData = { id: number; message: string; type: ToastType }

type ToastsProps = {
   toasts: ToastData[]
   onDismiss: (id: number) => void
}

const Toasts = ({ toasts, onDismiss }: ToastsProps) => {
   return (
      <div className="toasts">
         {toasts.map((toast) => (
            <div key={toast.id} className={`toast ${toast.type}`} onClick={() => onDismiss(toast.id)} title="Dismiss">
               {toast.message}
            </div>
         ))}
      </div>
   )
}

export default Toasts
