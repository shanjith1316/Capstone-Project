import React, { useState, useEffect, useRef, useMemo } from "react";
import createSignalRConnection, { startSignalRConnection, sendMessage, onMessageReceived } from "../services/signalRService";
import { useNavigate } from "react-router-dom";
import { getToken, getUserId, getUsers } from "../services/authService";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

const Chat = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [selectedUser, setSelectedUser] = useState(null);
    const [allMessages, setAllMessages] = useState({});
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const senderId = getUserId(); // String from JWT
    const chatBoxRef = useRef(null);
    const connection = useMemo(() => createSignalRConnection(), []);

    useEffect(() => {
        if (!getToken()) navigate("/login");
    }, [navigate]);

    useEffect(() => {
        const fetchUsers = async () => {
            const userList = await getUsers();
            setUsers(userList.filter(user => user.id !== parseInt(senderId)));
        };
        fetchUsers();
    }, [senderId]);

    useEffect(() => {
        let isMounted = true;
        const setupSignalR = async () => {
            try {
                console.log("🔌 Starting SignalR connection...");
                await startSignalRConnection(connection);
                console.log("✅ SignalR connected, state:", connection.state);

                console.log("🔧 Registering onMessageReceived listener...");
                onMessageReceived(connection, newMessage => {
                    console.log("📩 Received in Chat.js:", newMessage);
                    const senderIdNum = parseInt(newMessage.senderId || newMessage.SenderId);
                    const receiverIdNum = parseInt(newMessage.receiverId || newMessage.ReceiverId);
                    const chatKey = getChatKey(senderIdNum, receiverIdNum);
                    const activeChatKey = selectedUser ? getChatKey(parseInt(senderId), selectedUser.id) : "None";
                    console.log("🔑 Chat key from message:", chatKey, "Active chat key:", activeChatKey);
                
                    setAllMessages(prev => {
                        const updatedMessages = [...(prev[chatKey] || []), newMessage]
                            .filter((m, i, self) => self.findIndex(n => n.timestamp === m.timestamp) === i)
                            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                        console.log("📚 Updated allMessages:", updatedMessages);
                        return { ...prev, [chatKey]: updatedMessages };
                    });
                
                    if (chatKey === activeChatKey) {
                        console.log("🎯 Updating active chat messages...");
                        setMessages(prev => {
                            const updated = [...prev, newMessage]
                                .filter((m, i, self) => self.findIndex(n => n.timestamp === m.timestamp) === i)
                                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                            console.log("📲 Updated messages:", updated);
                            if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
                            return updated;
                        });
                    } else {
                        console.log("⚠️ Chat key mismatch, not updating UI");
                    }
                });

                if (isMounted) {
                    console.log("📋 Invoking GetOnlineUsers...");
                    await connection.invoke("GetOnlineUsers");
                }
            } catch (error) {
                console.error("❌ SignalR Connection Error:", error);
            }
        };
        setupSignalR();

        connection.on("UserOnline", userId => {
            console.log("👤 UserOnline:", userId);
            setOnlineUsers(prev => new Set([...prev, userId]));
        });
        connection.on("UserOffline", userId => {
            console.log("👤 UserOffline:", userId);
            setOnlineUsers(prev => new Set(prev).delete(userId) ? prev : prev);
        });
        connection.on("OnlineUsers", userList => {
            console.log("📋 OnlineUsers:", userList);
            setOnlineUsers(new Set(userList));
        });

        return () => {
            isMounted = false;
            console.log("🧹 Cleaning up SignalR listeners...");
            connection.off("ReceiveMessage");
            connection.off("UserOnline");
            connection.off("UserOffline");
            connection.off("OnlineUsers");
            connection.stop().catch(err => console.error("❌ Error stopping connection:", err));
        };
    }, [connection, selectedUser, senderId]);

    useEffect(() => {
        if (!selectedUser) return;
        const fetchChatHistory = async () => {
            try {
                const response = await axios.get(`http://localhost:5137/api/messages/${selectedUser.id}`, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                if (Array.isArray(response.data)) {
                    const chatKey = getChatKey(parseInt(senderId), selectedUser.id);
                    console.log("📜 Fetched chat history for key:", chatKey, response.data);
                    setAllMessages(prev => ({
                        ...prev,
                        [chatKey]: [...response.data].sort((a, b) => new Date(a.timestamp || a.Timestamp) - new Date(b.timestamp || b.Timestamp))
                    }));
                }
            } catch (error) {
                console.error("❌ Error fetching chat history:", error);
            }
        };
        fetchChatHistory();
    }, [selectedUser, senderId]);

    useEffect(() => {
        if (selectedUser) {
            const chatKey = getChatKey(parseInt(senderId), selectedUser.id);
            console.log("🔄 Setting messages for key:", chatKey, allMessages[chatKey] || []);
            setMessages([...(allMessages[chatKey] || [])]);
            if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [selectedUser, allMessages, senderId]);

    const handleSendMessage = async () => {
        if (message.trim() === "" || !selectedUser) return;
        try {
            if (connection.state !== "Connected") await startSignalRConnection(connection);
            console.log("📤 Sending message to:", selectedUser.id, message);
            await sendMessage(connection, selectedUser.id, message);
            setMessage("");
        } catch (error) {
            console.error("❌ Failed to send message:", error);
        }
    };

    const getChatKey = (userId1, userId2) => {
        const key = `${Math.min(userId1, userId2)}-${Math.max(userId1, userId2)}`;
        console.log("🔍 getChatKey:", userId1, userId2, "Result:", key);
        return key;
    };

    return (
        <div className="container mt-4">
            <h2 className="text-center mb-4">💬 Live Chat</h2>
            <div className="row">
                <div className="col-md-4">
                    <div className="card">
                        <div className="card-header">Users</div>
                        <div className="list-group list-group-flush">
                            {users.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => setSelectedUser(user)}
                                    className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${selectedUser?.id === user.id ? "active" : ""}`}
                                >
                                    {user.id} - {user.username}
                                    <span className={`badge ${onlineUsers.has(user.id.toString()) ? "bg-success" : "bg-danger"}`}>
                                        {onlineUsers.has(user.id.toString()) ? "Online" : "Offline"}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="col-md-8">
                    {selectedUser && (
                        <div className="card">
                            <div className="card-header">Chatting with {selectedUser.username}</div>
                            <div ref={chatBoxRef} className="card-body chat-box" style={{ height: "300px", overflowY: "auto", background: "#f8f9fa" }}>
                                {messages.length === 0 ? (
                                    <p className="text-muted text-center">No messages yet.</p>
                                ) : (
                                    messages.map((msg, index) => (
                                        <div
                                            key={index}
                                            className={`d-flex ${parseInt(msg.senderId || msg.SenderId) === parseInt(senderId) ? "justify-content-end" : "justify-content-start"}`}
                                        >
                                            <div
                                                className={`mb-2 p-2 rounded ${parseInt(msg.senderId || msg.SenderId) === parseInt(senderId) ? "bg-primary text-white" : "bg-light text-dark"}`}
                                                style={{ maxWidth: "75%", padding: "10px 15px", borderRadius: "15px", margin: "5px" }}
                                            >
                                                <strong>{parseInt(msg.senderId || msg.SenderId) === parseInt(senderId) ? "You" : msg.senderUsername || "Unknown"}:</strong> {msg.content}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="card-footer d-flex">
                                <input
                                    type="text"
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="form-control"
                                    onKeyDown={e => e.key === "Enter" && handleSendMessage()}
                                />
                                <button onClick={handleSendMessage} className="btn btn-primary ms-2">Send</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Chat;