// Ongea Pesa Service Worker
// This service worker handles push notifications and offline functionality

self.addEventListener("push", function (event) {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: data.icon || "/icons/icon-192x192.png",
            badge: "/icons/badge-72x72.png",
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: data.primaryKey || "1",
                url: data.url || "/",
            },
            actions: data.actions || [
                { action: "open", title: "Open App" },
                { action: "dismiss", title: "Dismiss" },
            ],
            tag: data.tag || "ongea-pesa-notification",
            renotify: true,
        };
        event.waitUntil(self.registration.showNotification(data.title, options));
    }
});

self.addEventListener("notificationclick", function (event) {
    console.log("Notification click received.");
    event.notification.close();

    const action = event.action;
    const notificationData = event.notification.data;

    if (action === "dismiss") {
        return;
    }

    const urlToOpen = notificationData?.url || "/";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes(self.location.origin) && "focus" in client) {
                    client.navigate(urlToOpen);
                    return client.focus();
                }
            }
            // If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Background sync for offline transactions
self.addEventListener("sync", function (event) {
    if (event.tag === "sync-transactions") {
        event.waitUntil(syncTransactions());
    }
});

async function syncTransactions() {
    try {
        // Get pending transactions from IndexedDB
        const db = await openDB();
        const tx = db.transaction("pending-transactions", "readonly");
        const store = tx.objectStore("pending-transactions");
        const pendingTx = await store.getAll();

        for (const transaction of pendingTx) {
            try {
                // Attempt to sync each transaction
                const response = await fetch("/api/transactions/sync", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(transaction),
                });

                if (response.ok) {
                    // Remove from pending if successful
                    const deleteTx = db.transaction("pending-transactions", "readwrite");
                    await deleteTx.objectStore("pending-transactions").delete(transaction.id);
                }
            } catch (err) {
                console.error("Failed to sync transaction:", err);
            }
        }
    } catch (err) {
        console.error("Sync failed:", err);
    }
}

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("ongea-pesa-db", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("pending-transactions")) {
                db.createObjectStore("pending-transactions", { keyPath: "id" });
            }
        };
    });
}

// Handle install event
self.addEventListener("install", (event) => {
    console.log("Service Worker installing.");
    self.skipWaiting();
});

// Handle activate event
self.addEventListener("activate", (event) => {
    console.log("Service Worker activated.");
    event.waitUntil(clients.claim());
});
