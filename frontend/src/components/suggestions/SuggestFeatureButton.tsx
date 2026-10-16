import { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import SuggestionForm from './SuggestionForm'

interface SuggestFeatureButtonProps {
  onSubmitted?: () => void
}

export default function SuggestFeatureButton({ onSubmitted }: SuggestFeatureButtonProps) {
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)

  if (!user) return null

  const handleSuccess = () => {
    setShowForm(false)
    // Refresh the feature list so the newly published suggestion shows up immediately
    onSubmitted?.()
  }

  return (
    <>
      <Button onClick={() => setShowForm(true)} className="gap-2">
        <Lightbulb className="w-4 h-4" />
        Suggest Feature
      </Button>
      <SuggestionForm 
        open={showForm} 
        onClose={() => setShowForm(false)}
        onSuccess={handleSuccess}
      />
    </>
  )
}
