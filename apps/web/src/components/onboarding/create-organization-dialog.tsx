import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { slugify } from './utils'

export function OrganizationFormFields({
  orgName,
  orgSlug,
  setOrgName,
  setOrgSlug,
  idPrefix,
}: {
  orgName: string
  orgSlug: string
  setOrgName: (v: string) => void
  setOrgSlug: (v: string) => void
  idPrefix: string
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>Organization name</Label>
        <Input
          id={`${idPrefix}-name`}
          placeholder="Acme Inc."
          value={orgName}
          onChange={(e) => {
            setOrgName(e.target.value)
            if (!orgSlug || orgSlug === slugify(orgName)) {
              setOrgSlug(slugify(e.target.value))
            }
          }}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-slug`}>Slug</Label>
        <Input
          id={`${idPrefix}-slug`}
          placeholder="acme-inc"
          value={orgSlug}
          onChange={(e) => setOrgSlug(slugify(e.target.value))}
          required
        />
        {idPrefix === 'dialog' && (
          <p className="text-xs text-muted-foreground">
            Used in URLs. Lowercase, letters, numbers and hyphens only.
          </p>
        )}
      </div>
    </>
  )
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
  orgName,
  orgSlug,
  setOrgName,
  setOrgSlug,
  isCreating,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgName: string
  orgSlug: string
  setOrgName: (v: string) => void
  setOrgSlug: (v: string) => void
  isCreating: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          New organization
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
          <DialogDescription>Create a new organization. You will be the owner.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <OrganizationFormFields
            orgName={orgName}
            orgSlug={orgSlug}
            setOrgName={setOrgName}
            setOrgSlug={setOrgSlug}
            idPrefix="dialog"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating && <Loader2 className="size-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function useOrganizationForm() {
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const reset = () => {
    setOrgName('')
    setOrgSlug('')
  }
  return { orgName, orgSlug, setOrgName, setOrgSlug, reset }
}
