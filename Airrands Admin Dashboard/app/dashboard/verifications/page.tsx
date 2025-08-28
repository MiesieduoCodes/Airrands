"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, doc, updateDoc, query, where, orderBy } from "firebase/firestore"
import { db } from "../../../lib/firebase"
import { sendVerificationStatusEmail } from "../../../lib/emailService"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, XCircle, Eye, User, Calendar, AlertCircle, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface Verification {
  id: string
  userId: string
  userRole: "seller" | "runner"
  ninImageURL: string
  status: "pending" | "approved" | "rejected"
  submittedAt: string
  reviewedAt?: string
  reviewerNotes?: string
  userEmail?: string
  userName?: string
}

export default function VerificationsPage() {
  const [verifications, setVerifications] = useState<Verification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [reviewNotes, setReviewNotes] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [bulkActions, setBulkActions] = useState<string[]>([])

  useEffect(() => {
    fetchVerifications()
  }, [])

  const fetchVerifications = async () => {
    try {
      const q = query(collection(db, "verification"), orderBy("submittedAt", "desc"))
      const snapshot = await getDocs(q)
      const verificationData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Verification[]

      // Fetch user details for each verification
      const verificationsWithUserData = await Promise.all(
        verificationData.map(async (verification) => {
          try {
            const userDoc = await getDocs(query(collection(db, "users"), where("__name__", "==", verification.userId)))

            if (!userDoc.empty) {
              const userData = userDoc.docs[0].data()
              return {
                ...verification,
                userEmail: userData.email,
                userName: userData.name,
              }
            }
            return verification
          } catch (error) {
            console.error("Error fetching user data:", error)
            return verification
          }
        }),
      )

      setVerifications(verificationsWithUserData)
    } catch (error) {
      console.error("Error fetching verifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateVerificationStatus = async (verificationId: string, status: "approved" | "rejected") => {
    setIsUpdating(true)
    try {
      const verification = verifications.find((v) => v.id === verificationId)
      if (!verification) return

      // Update verification status
      await updateDoc(doc(db, "verification", verificationId), {
        status,
        reviewedAt: new Date().toISOString(),
        reviewerNotes: reviewNotes || undefined,
      })

      // Update user verification status
      await updateDoc(doc(db, "users", verification.userId), {
        verificationStatus: status,
        verificationReviewedAt: new Date().toISOString(),
      })

      // Update role-specific collection
      const roleCollection = verification.userRole === "seller" ? "sellers" : "runners"
      await updateDoc(doc(db, roleCollection, verification.userId), {
        verificationStatus: status,
        verificationReviewedAt: new Date().toISOString(),
      })

      // Send email notification
      if (verification.userEmail) {
        await sendVerificationStatusEmail(verification.userEmail, status, verification.userRole, reviewNotes)
      }

      // Update local state
      setVerifications((prev) =>
        prev.map((v) =>
          v.id === verificationId
            ? {
                ...v,
                status: status,
                reviewedAt: new Date().toISOString(),
                reviewerNotes: reviewNotes || undefined,
              }
            : v,
        ),
      )

      setShowModal(false)
      setSelectedVerification(null)
      setReviewNotes("")
    } catch (error) {
      console.error("Error updating verification status:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBulkAction = async (action: "approve" | "reject") => {
    if (bulkActions.length === 0) return

    setIsUpdating(true)
    try {
      const status = action === "approve" ? "approved" : "rejected"

      // Process each selected verification
      for (const verificationId of bulkActions) {
        const verification = verifications.find((v) => v.id === verificationId)
        if (!verification) continue

        // Update verification status
        await updateDoc(doc(db, "verification", verificationId), {
          status,
          reviewedAt: new Date().toISOString(),
          reviewerNotes: "Bulk processed",
        })

        // Update user verification status
        await updateDoc(doc(db, "users", verification.userId), {
          verificationStatus: status,
          verificationReviewedAt: new Date().toISOString(),
        })

        // Update role-specific collection
        const roleCollection = verification.userRole === "seller" ? "sellers" : "runners"
        await updateDoc(doc(db, roleCollection, verification.userId), {
          verificationStatus: status,
          verificationReviewedAt: new Date().toISOString(),
        })

        // Send email notification
        if (verification.userEmail) {
          await sendVerificationStatusEmail(verification.userEmail, status, verification.userRole, "Bulk processed")
        }
      }

      // Update local state
      setVerifications((prev) =>
        prev.map((v) =>
          bulkActions.includes(v.id)
            ? {
                ...v,
                status: action === "approve" ? "approved" : "rejected",
                reviewedAt: new Date().toISOString(),
                reviewerNotes: "Bulk processed",
              }
            : v,
        ),
      )

      setBulkActions([])
    } catch (error) {
      console.error("Error processing bulk actions:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const openVerificationModal = (verification: Verification) => {
    setSelectedVerification(verification)
    setReviewNotes(verification.reviewerNotes || "")
    setShowModal(true)
  }

  const toggleBulkSelection = (verificationId: string) => {
    setBulkActions((prev) =>
      prev.includes(verificationId) ? prev.filter((id) => id !== verificationId) : [...prev, verificationId],
    )
  }

  const filteredVerifications = verifications.filter((verification) =>
    filter === "all" ? true : verification.status === filter,
  )

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "secondary" as const, icon: AlertCircle },
      approved: { variant: "default" as const, icon: CheckCircle },
      rejected: { variant: "destructive" as const, icon: XCircle },
    }

    const config = variants[status as keyof typeof variants]
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getRoleBadge = (role: string) => {
    return <Badge variant="outline">{role.charAt(0).toUpperCase() + role.slice(1)}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Verification Management</h1>
        <p className="text-muted-foreground">Review and manage NIN verification submissions</p>
      </div>

      {/* Filters and Bulk Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Verifications</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        {bulkActions.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{bulkActions.length} selected</span>
            <Button size="sm" onClick={() => handleBulkAction("approve")} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleBulkAction("reject")} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Reject
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkActions([])}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Verifications List */}
      <div className="grid gap-4">
        {filteredVerifications.map((verification) => (
          <Card key={verification.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Checkbox
                    checked={bulkActions.includes(verification.id)}
                    onCheckedChange={() => toggleBulkSelection(verification.id)}
                  />
                  <Avatar>
                    <AvatarFallback>{verification.userName?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{verification.userName || "Unknown User"}</h3>
                      {getStatusBadge(verification.status)}
                      {getRoleBadge(verification.userRole)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {verification.userEmail || "No email"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(verification.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {verification.reviewerNotes && (
                      <p className="text-sm text-muted-foreground">Notes: {verification.reviewerNotes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openVerificationModal(verification)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Review
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVerifications.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No verifications found</h3>
            <p className="text-muted-foreground text-center">
              There are no verifications matching your current filter.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Verification Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review NIN Verification - {selectedVerification?.userName}</DialogTitle>
            <DialogDescription>Review the submitted NIN verification and provide feedback.</DialogDescription>
          </DialogHeader>

          {selectedVerification && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">User</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedVerification.userName} ({selectedVerification.userEmail})
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Role</Label>
                  <div className="mt-1">{getRoleBadge(selectedVerification.userRole)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedVerification.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Submitted</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedVerification.submittedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {selectedVerification.ninImageURL ? (
                <div>
                  <Label className="text-sm font-medium">NIN Image</Label>
                  <div className="mt-2 border rounded-lg overflow-hidden">
                    <img
                      src={selectedVerification.ninImageURL || "/placeholder.svg"}
                      alt="NIN Card"
                      className="w-full h-64 object-contain bg-muted"
                    />
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No NIN image uploaded</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div>
                <Label htmlFor="reviewNotes">Review Notes</Label>
                <Textarea
                  id="reviewNotes"
                  value={reviewNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReviewNotes(e.target.value)}
                  placeholder="Add review notes (optional)..."
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            {selectedVerification?.status === "pending" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => updateVerificationStatus(selectedVerification.id, "rejected")}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Reject
                </Button>
                <Button
                  onClick={() => updateVerificationStatus(selectedVerification.id, "approved")}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
