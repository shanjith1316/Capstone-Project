import * as signalR from "@microsoft/signalr";
import { getToken } from "./authService";

// ✅ Function to create a new SignalR connection per tab
const createSignalRConnection = () => {
    const conn = new signalR.HubConnectionBuilder()
        .withUrl("http://localhost:5137/chatHub", {
            accessTokenFactory: () => getToken(), // ✅ Use tab-specific token from sessionStorage
            withCredentials: false
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000]) // ✅ Retry with delays
        .configureLogging(signalR.LogLevel.Information)
        .build();

    // ✅ Setup reconnection events
    conn.onreconnecting(() => console.warn("🔄 SignalR reconnecting..."));
    conn.onreconnected(() => console.log("✅ SignalR reconnected."));
    conn.onclose(async () => {
        console.warn("⚠️ SignalR disconnected. Attempting to reconnect...");
        setTimeout(() => startSignalRConnection(conn), 5000);
    });

    return conn;
};

// ✅ Start SignalR Connection
export const startSignalRConnection = async (connection) => {
    if (connection.state === signalR.HubConnectionState.Connected) {
        console.log("✅ SignalR already connected.");
        return;
    }

    if (connection.state !== signalR.HubConnectionState.Disconnected) {
        console.log("⏳ SignalR is connecting or reconnecting, waiting...");
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait briefly
    }

    try {
        console.log("🔄 Attempting to connect to SignalR...");
        await connection.start();
        console.log("✅ SignalR connection established.");
    } catch (error) {
        console.error("❌ SignalR connection failed:", error.message);
        throw error;
    }
};

// ✅ Send Message with Connection Check
export const sendMessage = async (connection, receiverId, message) => {
    try {
        if (connection.state !== signalR.HubConnectionState.Connected) {
            await startSignalRConnection(connection);
        }
        // Ensure receiverId is a string and message is non-empty
        const receiverIdStr = receiverId.toString();
        if (!receiverIdStr || !message.trim()) throw new Error("Invalid receiverId or message");
        await connection.invoke("SendMessage", receiverIdStr, message.trim());
        console.log(`✅ Message sent to ${receiverId}: ${message}`);
    } catch (err) {
        console.error("❌ Failed to send message:", err.message);
        throw err;
    }
};

// ✅ Listen for Incoming Messages with Robust Mapping
export const onMessageReceived = (connection, callback) => {
    connection.on("ReceiveMessage", (message) => {
        console.log("📩 Raw message from SignalR:", message);
        const mappedMessage = {
            senderId: parseInt(message.SenderId || message.senderId) || 0, // Fallback to 0 if parsing fails
            receiverId: parseInt(message.ReceiverId || message.receiverId) || 0,
            content: message.Content || message.content || "",
            senderUsername: message.SenderUsername || message.senderUsername || "Unknown",
            receiverUsername: message.ReceiverUsername || message.receiverUsername || "Unknown",
            timestamp: message.Timestamp || message.timestamp || new Date().toISOString()
        };
        console.log("📩 Mapped message to callback:", mappedMessage);
        if (!mappedMessage.senderId || !mappedMessage.receiverId) {
            console.warn("⚠️ Invalid senderId or receiverId in message:", mappedMessage);
        }
        callback(mappedMessage);
    });
};

// ✅ Export a factory function to get a new connection
export default createSignalRConnection;