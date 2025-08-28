"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { collection, onSnapshot, query, where, orderBy, limit } from "firebase/firestore"
import { db } from "../lib/firebase"
import { toast } from "sonner"
import { Bell, CheckCircle, CreditCard } from "lucide-react"

interface Notification {
  id: string
  type: "payment" | "verification" | "user_registration"
  title: string
  message: string
  timestamp: Date
  read: boolean
  data?: any
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotifications: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [lastPaymentCount, setLastPaymentCount] = useState(0)
  const [lastVerificationCount, setLastVerificationCount] = useState(0)

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio("https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3")
      audio.volume = 0.5
      audio.play().catch(() => {
        // Fallback to system beep if audio file not available
        console.log("🔔 New notification received!")
      })
    } catch (error) {
      console.log("🔔 New notification received!")
    }
  }

  // Listen for new payments
  useEffect(() => {
    const paymentsQuery = query(
      collection(db, "payments"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc"),
      limit(50),
    )

    const unsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
      const currentCount = snapshot.size

      if (lastPaymentCount > 0 && currentCount > lastPaymentCount) {
        const newPayments = snapshot.docs.slice(0, currentCount - lastPaymentCount)

        newPayments.forEach((doc) => {
          const payment = doc.data()
          const notification: Notification = {
            id: `payment-${doc.id}`,
            type: "payment",
            title: "New Payment Received",
            message: `Payment of ${payment.currency || "USD"} ${payment.amount} from ${payment.userName || "Unknown User"}`,
            timestamp: new Date(),
            read: false,
            data: { paymentId: doc.id, ...payment },
          }

          setNotifications((prev) => [notification, ...prev])

          // Show toast notification
          toast.success("New Payment Received", {
            description: notification.message,
            icon: <CreditCard className="h-4 w-4" />,
            action: {
              label: "Review",
              onClick: () => (window.location.href = "/dashboard/payments"),
            },
          })

          playNotificationSound()
        })
      }

      setLastPaymentCount(currentCount)
    })

    return unsubscribe
  }, [lastPaymentCount])

  // Listen for new verifications
  useEffect(() => {
    const verificationsQuery = query(
      collection(db, "verification"),
      where("status", "==", "pending"),
      orderBy("submittedAt", "desc"),
      limit(50),
    )

    const unsubscribe = onSnapshot(verificationsQuery, (snapshot) => {
      const currentCount = snapshot.size

      if (lastVerificationCount > 0 && currentCount > lastVerificationCount) {
        const newVerifications = snapshot.docs.slice(0, currentCount - lastVerificationCount)

        newVerifications.forEach((doc) => {
          const verification = doc.data()
          const notification: Notification = {
            id: `verification-${doc.id}`,
            type: "verification",
            title: "New Verification Submitted",
            message: `${verification.userRole || "User"} verification from ${verification.userName || "Unknown User"}`,
            timestamp: new Date(),
            read: false,
            data: { verificationId: doc.id, ...verification },
          }

          setNotifications((prev) => [notification, ...prev])

          // Show toast notification
          toast.info("New Verification Submitted", {
            description: notification.message,
            icon: <CheckCircle className="h-4 w-4" />,
            action: {
              label: "Review",
              onClick: () => (window.location.href = "/dashboard/verifications"),
            },
          })

          playNotificationSound()
        })
      }

      setLastVerificationCount(currentCount)
    })

    return unsubscribe
  }, [lastVerificationCount])

  // Listen for new user registrations (runners/sellers)
  useEffect(() => {
    const runnersQuery = query(
      collection(db, "runners"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc"),
      limit(10),
    )

    const sellersQuery = query(
      collection(db, "sellers"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc"),
      limit(10),
    )

    const unsubscribeRunners = onSnapshot(runnersQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const runner = change.doc.data()
          const notification: Notification = {
            id: `runner-${change.doc.id}`,
            type: "user_registration",
            title: "New Runner Registration",
            message: `${runner.name || "Unknown User"} registered as a runner`,
            timestamp: new Date(),
            read: false,
            data: { runnerId: change.doc.id, ...runner },
          }

          setNotifications((prev) => [notification, ...prev])

          toast.info("New Runner Registration", {
            description: notification.message,
            icon: <Bell className="h-4 w-4" />,
            action: {
              label: "Review",
              onClick: () => (window.location.href = "/dashboard/runners"),
            },
          })

          playNotificationSound()
        }
      })
    })

    const unsubscribeSellers = onSnapshot(sellersQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const seller = change.doc.data()
          const notification: Notification = {
            id: `seller-${change.doc.id}`,
            type: "user_registration",
            title: "New Seller Registration",
            message: `${seller.name || "Unknown User"} registered as a seller`,
            timestamp: new Date(),
            read: false,
            data: { sellerId: change.doc.id, ...seller },
          }

          setNotifications((prev) => [notification, ...prev])

          toast.info("New Seller Registration", {
            description: notification.message,
            icon: <Bell className="h-4 w-4" />,
            action: {
              label: "Review",
              onClick: () => (window.location.href = "/dashboard/sellers"),
            },
          })

          playNotificationSound()
        }
      })
    })

    return () => {
      unsubscribeRunners()
      unsubscribeSellers()
    }
  }, [])

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    )
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
  }

  const clearNotifications = () => {
    setNotifications([])
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  }

  return <NotificationContext.Provider value={contextValue}>{children}</NotificationContext.Provider>
}
