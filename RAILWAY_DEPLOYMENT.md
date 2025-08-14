# 🚂 RAILWAY DEPLOYMENT GUIDE

## **🎯 ORDER TRACKING SERVER SETUP**

### **Step 1: Railway Environment Variables**

In your Railway dashboard, add these environment variables:

```bash
NODE_ENV=production
PORT=3000
RAILWAY_PUBLIC_DOMAIN=https://airrands-production.up.railway.app
```

### **Step 2: Update App Configuration**

**File: `src/config/production.ts`**
```typescript
// Your Railway domain (already configured):
SOCKET_URL: 'https://airrands-production.up.railway.app',
API_BASE_URL: 'https://airrands-production.up.railway.app/api',
```

**File: `server.js`**
- Already configured to use Railway environment variables
- Will automatically use your Railway domain

### **Step 3: Deploy to Railway**

1. **Push your code to Git** (Railway will auto-deploy)
2. **Check Railway logs** for any errors
3. **Verify health check** at `/health` endpoint

### **Step 4: Test Order Tracking**

1. **Start your app** and create an order/errand
2. **Check real-time updates** via Socket.io
3. **Verify location tracking** works
4. **Test notifications** are sent

---

## **🔧 TROUBLESHOOTING**

### **If Order Tracking Doesn't Work:**

1. **Check Railway logs** for server errors
2. **Verify Socket.io connection** in app
3. **Check CORS settings** match your app domain
4. **Ensure environment variables** are set correctly

### **Common Issues:**

- **CORS errors**: Update CORS_ORIGIN in server.js
- **Socket connection failed**: Check Railway domain in production.ts
- **Port issues**: Railway handles ports automatically

---

## **✅ WHAT THIS ENABLES:**

- **Real-time order tracking** across all devices
- **Live location updates** for runners
- **Instant notifications** for status changes
- **Order progress tracking** with timestamps
- **Multi-user synchronization** (Buyer, Seller, Runner)

---

## **🚀 NEXT STEPS:**

1. **Deploy to Railway** (automatic from Git)
2. **Update production.ts** with your Railway domain
3. **Test order tracking** in your app
4. **Verify real-time updates** work

**Your order tracking will be fully functional once deployed!** 🎉
