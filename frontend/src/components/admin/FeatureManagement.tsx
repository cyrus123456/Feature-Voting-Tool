import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Search,
  TrendingUp,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

interface Feature {
  id: string
  title: string
  description: string
  votesUp: number
  votesDown: number
  createdAt: number
  updatedAt: number
}

export default function FeatureManagement() {
  const { t } = useTranslation()
  const { token } = useAuth()
  const { toast } = useToast()
  const [features, setFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  })

  useEffect(() => {
    loadFeatures()
  }, [])

  async function loadFeatures() {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/features`)

      if (!response.ok) throw new Error('Failed to fetch features')

      const data = await response.json()
      setFeatures(data || [])
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load features',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateFeature() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/features`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
        }),
      })

      if (!response.ok) throw new Error('Failed to create feature')

      toast({
        title: 'Success',
        description: 'Feature created successfully',
      })

      setShowCreateDialog(false)
      resetForm()
      loadFeatures()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create feature',
        variant: 'destructive',
      })
    }
  }

  async function handleUpdateFeature() {
    if (!selectedFeature) return

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/features/${selectedFeature.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
          }),
        }
      )

      if (!response.ok) throw new Error('Failed to update feature')

      toast({
        title: 'Success',
        description: 'Feature updated successfully',
      })

      setShowEditDialog(false)
      resetForm()
      loadFeatures()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update feature',
        variant: 'destructive',
      })
    }
  }

  async function handleDeleteFeature() {
    if (!selectedFeature) return

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/features/${selectedFeature.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) throw new Error('Failed to delete feature')

      toast({
        title: 'Success',
        description: 'Feature deleted successfully',
      })

      setShowDeleteDialog(false)
      setSelectedFeature(null)
      loadFeatures()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete feature',
        variant: 'destructive',
      })
    }
  }

  function resetForm() {
    setFormData({
      title: '',
      description: '',
    })
    setSelectedFeature(null)
  }

  function openEditDialog(feature: Feature) {
    setSelectedFeature(feature)
    setFormData({
      title: feature.title,
      description: feature.description || '',
    })
    setShowEditDialog(true)
  }

  const filteredFeatures = features.filter(
    (feature) =>
      feature.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (feature.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalVotes = features.reduce((sum, f) => sum + f.votesUp + f.votesDown, 0)
  const avgVotesPerFeature = features.length > 0 ? (totalVotes / features.length).toFixed(1) : 0

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading features...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Total Features</p>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-2">{features.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Total Votes</p>
            <ThumbsUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold mt-2">{totalVotes}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Avg Votes/Feature</p>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold mt-2">{avgVotesPerFeature}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Most Popular</p>
            <ThumbsUp className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold mt-2">
            {features.length > 0 ? Math.max(...features.map((f) => f.votesUp)) : 0}
          </p>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Feature
        </Button>
      </div>

      {/* Features Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feature Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Votes</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFeatures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No features found
                </TableCell>
              </TableRow>
            ) : (
              filteredFeatures.map((feature) => (
                <TableRow key={feature.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{feature.title}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-md">
                      <p className="text-sm truncate">
                        {feature.description || 'No description'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-3">
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                      >
                        <ThumbsUp className="w-3 h-3 mr-1" />
                        {feature.votesUp}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                      >
                        <ThumbsDown className="w-3 h-3 mr-1" />
                        {feature.votesDown}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(feature.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openEditDialog(feature)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Feature
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            setSelectedFeature(feature)
                            setShowDeleteDialog(true)
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Feature
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Feature Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Feature</DialogTitle>
            <DialogDescription>Add a new feature to the voting platform</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create_title">
                {t('admin.form.title')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create_title"
                placeholder={t('admin.form.titlePlaceholder')}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_description">{t('admin.form.description')}</Label>
              <Textarea
                id="create_description"
                placeholder={t('admin.form.descriptionPlaceholder')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFeature} disabled={!formData.title}>
              Create Feature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Feature Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Feature</DialogTitle>
            <DialogDescription>Update feature information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_title">
                {t('admin.form.title')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit_title"
                placeholder={t('admin.form.titlePlaceholder')}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_description">{t('admin.form.description')}</Label>
              <Textarea
                id="edit_description"
                placeholder={t('admin.form.descriptionPlaceholder')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateFeature} disabled={!formData.title}>
              Update Feature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Feature Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Feature</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Are you sure you want to delete this feature?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-secondary rounded-lg">
              <p className="font-medium">{selectedFeature?.title}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFeature}>
              Delete Feature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
